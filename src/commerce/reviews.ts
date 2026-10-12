/**
 * Store reviews (storefront/v1/reviews): verified-purchase reviews customers can write
 * after a completed order, read by anyone.
 *
 * - GET    reviews?store&sort&limit&offset   newest | highest | lowest | oldest
 * - GET    reviews/count?store                { "1": n, …, "5": n }
 * - GET    reviews/eligibility?subject&order  { can_review, reason, message, order, review }
 * - POST   reviews                            { subject, order?, rating, content, files? }
 * - DELETE reviews/{id}
 *
 * Calls that need the customer go through `request`, usually the signed-in customer's
 * `performAuthorizedRequest`, so `is_mine` and eligibility reflect who is asking.
 */

export type Request = (path: string, data?: Record<string, any>, method?: 'GET' | 'POST' | 'DELETE') => Promise<any>;

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'oldest';
export const REVIEW_SORTS: ReviewSort[] = ['newest', 'highest', 'lowest', 'oldest'];

export type Review = {
    id: string;
    rating: number;
    content: string;
    author: string;
    avatarUrl: string | null;
    photos: { id: string; url: string }[];
    verified: boolean;
    mine: boolean;
    createdAt: string | null;
};

export type RatingSummary = { total: number; average: number | null; rows: { star: number; count: number; percent: number }[] };

export type EligibilityReason = 'sign_in_required' | 'unsupported_subject' | 'no_completed_order' | 'already_reviewed' | 'unknown';
export type Eligibility = { canReview: boolean; reason: EligibilityReason | null; orderId: string | null; reviewId: string | null };

export const MAX_REVIEW_PHOTOS = 4;
export const MAX_REVIEW_LENGTH = 2000;

const PLACEHOLDER_AVATARS = ['no-avatar', 'default-avatar', 'image-file-icon'];

function clampRating(value: unknown): number {
    const rating = Math.round(Number(value));
    return Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;
}

export function parseReview(json: any): Review {
    const avatar = typeof json?.customer?.photo_url === 'string' ? json.customer.photo_url : null;
    return {
        id: String(json?.id ?? ''),
        rating: clampRating(json?.rating),
        content: String(json?.content ?? ''),
        author: String(json?.customer?.name ?? '').trim(),
        avatarUrl: avatar && !PLACEHOLDER_AVATARS.some((placeholder) => avatar.includes(placeholder)) ? avatar : null,
        photos: (Array.isArray(json?.photos) ? json.photos : [])
            .filter((photo: any) => typeof photo?.url === 'string')
            .map((photo: any) => ({ id: String(photo.id ?? photo.url), url: photo.url })),
        verified: json?.verified === true,
        mine: json?.is_mine === true,
        createdAt: json?.created_at ?? null,
    };
}

/** Totals, average and per-star share from the count endpoint, five stars first. */
export function ratingSummary(counts: Record<string, unknown> | null | undefined): RatingSummary {
    const rows = [5, 4, 3, 2, 1].map((star) => ({ star, count: Math.max(0, Math.round(Number(counts?.[star] ?? counts?.[String(star)] ?? 0)) || 0), percent: 0 }));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    for (const row of rows) row.percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
    const average = total > 0 ? Math.round((rows.reduce((sum, row) => sum + row.star * row.count, 0) / total) * 10) / 10 : null;
    return { total, average, rows };
}

export function parseEligibility(json: any): Eligibility {
    const known: EligibilityReason[] = ['sign_in_required', 'unsupported_subject', 'no_completed_order', 'already_reviewed'];
    const reason = json?.reason ? (known.includes(json.reason) ? json.reason : 'unknown') : null;
    return { canReview: json?.can_review === true, reason, orderId: json?.order ?? null, reviewId: json?.review ?? null };
}

export async function fetchReviews(
    request: Request,
    { storeId, sort = 'newest', limit = 20, offset = 0 }: { storeId: string; sort?: ReviewSort; limit?: number; offset?: number }
): Promise<Review[]> {
    const json = await request('reviews', { store: storeId, sort, limit, offset });
    return (Array.isArray(json) ? json : []).map(parseReview).filter((review) => review.id);
}

export async function fetchRatingSummary(request: Request, storeId: string): Promise<RatingSummary> {
    return ratingSummary(await request('reviews/count', { store: storeId }));
}

export async function fetchEligibility(request: Request, subjectId: string, orderId?: string | null): Promise<Eligibility> {
    return parseEligibility(await request('reviews/eligibility', orderId ? { subject: subjectId, order: orderId } : { subject: subjectId }));
}

export type ReviewPhoto = { data: string; type: string };

export async function createReview(
    request: Request,
    { subjectId, orderId = null, rating, content, photos = [] }: { subjectId: string; orderId?: string | null; rating: number; content: string; photos?: ReviewPhoto[] }
): Promise<Review> {
    const body: Record<string, any> = { subject: subjectId, rating: clampRating(rating), content: content.trim().slice(0, MAX_REVIEW_LENGTH) };
    if (orderId) body.order = orderId;
    if (photos.length > 0) body.files = photos.slice(0, MAX_REVIEW_PHOTOS);
    return parseReview(await request('reviews', body, 'POST'));
}

export async function deleteReview(request: Request, reviewId: string): Promise<void> {
    await request(`reviews/${reviewId}`, {}, 'DELETE');
}

/** "2 days ago", "3 weeks ago" … in the given locale; null when the date is unusable. */
export function relativeTime(value: string | null, now: Date, locale = 'en'): string | null {
    if (!value) return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return null;
    const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    // Hermes builds without Intl.RelativeTimeFormat get the plain date instead.
    if (typeof Intl === 'undefined' || typeof (Intl as any).RelativeTimeFormat !== 'function') return at.toLocaleDateString(locale);
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const [unit, size] of steps) {
        if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
    }
    return format.format(0, 'minute');
}

const reviewTime = (review: Review) => (review.createdAt ? Date.parse(review.createdAt) || 0 : 0);

/**
 * The loaded reviews in the chosen order, so switching sort is instant while the server's
 * first page for that order loads. Ties fall back to newest first.
 */
export function sortReviews(reviews: Review[], sort: ReviewSort): Review[] {
    const newest = (a: Review, b: Review) => reviewTime(b) - reviewTime(a);
    const compare: Record<ReviewSort, (a: Review, b: Review) => number> = {
        newest,
        oldest: (a, b) => reviewTime(a) - reviewTime(b),
        highest: (a, b) => b.rating - a.rating || newest(a, b),
        lowest: (a, b) => a.rating - b.rating || newest(a, b),
    };
    return [...reviews].sort(compare[sort]);
}
