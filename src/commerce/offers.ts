/**
 * Public offers (storefront/v1/promotions): what a store or the network is running,
 * for the home rail, the offers list and the offer page.
 *
 * - GET promotions?include=scheduled&store   live promotions (and ones outside their hours)
 * - GET promotions/{id}                      one promotion, including scheduled and ended
 *
 * Each promotion carries its owner (store or network), a shareable code when it's a code
 * promotion, `availability` (live | scheduled | ended | inactive) and `next_starts_at`.
 */

export type OfferType = 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo';
export type Availability = 'live' | 'scheduled' | 'ended' | 'inactive';
export type ScheduleWindow = { days: number[]; start: string; end: string };

export type Offer = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    type: OfferType;
    /** Percent (0–100) or minor units, depending on the type. */
    value: number;
    maxDiscount: number | null;
    currency: string | null;
    minSubtotal: number | null;
    minItems: number | null;
    firstOrderOnly: boolean;
    perCustomerLimit: number | null;
    stackable: boolean;
    trigger: 'automatic' | 'code';
    code: string | null;
    availability: Availability;
    nextStartsAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
    schedule: ScheduleWindow[];
    timezone: string | null;
    owner: { type: 'store' | 'network'; id: string; name: string; logoUrl: string | null } | null;
    appliesTo: { products: string[]; stores: string[]; categories: string[]; excludeProducts: string[]; excludeCategories: string[] };
    bogo: { buy: number; get: number } | null;
};

export const OFFER_TYPES: OfferType[] = ['percentage', 'fixed_amount', 'free_delivery', 'bogo'];

const positive = (value: unknown): number | null => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
};
const ids = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);

export function parseOffer(json: any): Offer {
    const type: OfferType = OFFER_TYPES.includes(json?.type) ? json.type : 'percentage';
    const availability: Availability = ['live', 'scheduled', 'ended', 'inactive'].includes(json?.availability) ? json.availability : 'live';
    const owner = json?.owner && (json.owner.type === 'store' || json.owner.type === 'network') && json.owner.id ? { type: json.owner.type, id: String(json.owner.id), name: String(json.owner.name ?? ''), logoUrl: json.owner.logo_url ?? null } : null;
    const appliesTo = json?.applies_to ?? {};
    const bogo = type === 'bogo' ? { buy: positive(json?.bogo_config?.buy_quantity ?? json?.bogo_config?.buy) ?? 1, get: positive(json?.bogo_config?.get_quantity ?? json?.bogo_config?.get) ?? 1 } : null;
    return {
        id: String(json?.id ?? ''),
        name: String(json?.name ?? ''),
        description: json?.description || null,
        imageUrl: typeof json?.image_url === 'string' && json.image_url ? json.image_url : null,
        type,
        value: Number(json?.value) || 0,
        maxDiscount: positive(json?.max_discount_amount),
        currency: json?.currency ?? null,
        minSubtotal: positive(json?.min_subtotal),
        minItems: positive(json?.min_items),
        firstOrderOnly: json?.first_order_only === true,
        perCustomerLimit: positive(json?.usage_limit_per_customer),
        stackable: json?.stackable === true,
        trigger: json?.trigger === 'code' || json?.code ? 'code' : 'automatic',
        code: typeof json?.code === 'string' && json.code ? json.code : null,
        availability,
        nextStartsAt: json?.next_starts_at ?? null,
        startsAt: json?.starts_at ?? null,
        endsAt: json?.ends_at ?? null,
        schedule: (Array.isArray(json?.schedule) ? json.schedule : [])
            .filter((window: any) => window && typeof window === 'object')
            .map((window: any) => ({ days: (Array.isArray(window.days) ? window.days : [1, 2, 3, 4, 5, 6, 7]).map(Number).filter((day: number) => day >= 1 && day <= 7), start: String(window.start ?? '00:00'), end: String(window.end ?? '24:00') })),
        timezone: json?.timezone ?? null,
        owner,
        appliesTo: { products: ids(appliesTo.products), stores: ids(appliesTo.stores), categories: ids(appliesTo.categories), excludeProducts: ids(appliesTo.exclude_products), excludeCategories: ids(appliesTo.exclude_categories) },
        bogo,
    };
}

/** The short badge on an offer: "15%", "$8", "FREE" (free delivery) or "1+1". */
export function offerBadge(offer: Offer, money: (amount: number) => string, freeLabel = 'FREE'): string {
    switch (offer.type) {
        case 'percentage':
            return `${Math.round(offer.value)}%`;
        case 'fixed_amount':
            return money(offer.value).replace(/\.00$/, '');
        case 'free_delivery':
            return freeLabel;
        case 'bogo':
            return `${offer.bogo?.buy ?? 1}+${offer.bogo?.get ?? 1}`;
    }
}

/** Offers ending within this many hours are "ending soon". */
export const ENDING_SOON_HOURS = 72;

export type OfferGroups = { endingSoon: Offer[]; ongoing: Offer[]; upcoming: Offer[] };

/**
 * Live offers ending soon (soonest first), other live offers, then scheduled ones (next
 * start first). Ended and inactive offers are left out.
 */
export function groupOffers(offers: Offer[], now: Date): OfferGroups {
    const soon = now.getTime() + ENDING_SOON_HOURS * 3600 * 1000;
    const endsAt = (offer: Offer) => (offer.endsAt ? new Date(offer.endsAt).getTime() : Infinity);
    const live = offers.filter((offer) => offer.availability === 'live');
    return {
        endingSoon: live.filter((offer) => endsAt(offer) <= soon).sort((a, b) => endsAt(a) - endsAt(b)),
        ongoing: live.filter((offer) => endsAt(offer) > soon),
        upcoming: offers
            .filter((offer) => offer.availability === 'scheduled')
            .sort((a, b) => (a.nextStartsAt ? new Date(a.nextStartsAt).getTime() : Infinity) - (b.nextStartsAt ? new Date(b.nextStartsAt).getTime() : Infinity)),
    };
}

/** The offer to feature first: a first-order offer, else one with an image, else the first. */
export function featuredOffer(offers: Offer[]): Offer | null {
    const live = offers.filter((offer) => offer.availability === 'live');
    return live.find((offer) => offer.firstOrderOnly) ?? live.find((offer) => offer.imageUrl) ?? live[0] ?? null;
}

function clock(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})/.exec(value);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * Weekly windows as readable text: "Mon – Fri, 2 – 5 pm". Days are ISO (1 = Monday).
 * `dayName(iso)` and `time(minutes)` come from the caller so they follow the locale.
 */
export function describeSchedule(windows: ScheduleWindow[], dayName: (isoDay: number) => string, time: (minutes: number) => string, allDays = 'Every day'): string[] {
    return windows
        .map((window) => {
            const days = [...new Set(window.days)].sort((a, b) => a - b);
            const runs: number[][] = [];
            for (const day of days) {
                const last = runs[runs.length - 1];
                if (last && day === last[last.length - 1] + 1) last.push(day);
                else runs.push([day]);
            }
            const dayText = days.length === 7 ? allDays : runs.map((run) => (run.length > 2 ? `${dayName(run[0])} – ${dayName(run[run.length - 1])}` : run.map(dayName).join(', '))).join(', ');
            const start = clock(window.start);
            const end = clock(window.end);
            const allDay = (start ?? 0) === 0 && (end === null || end >= 1440);
            return allDay ? dayText : `${dayText}, ${time(start ?? 0)} – ${time(end ?? 1440)}`;
        })
        .filter(Boolean);
}

/** The network's own offers apply anywhere; a store offer applies at that store. */
export function offerStoreId(offer: Offer): string | null {
    if (offer.owner?.type === 'store') return offer.owner.id;
    return offer.appliesTo.stores.length === 1 ? offer.appliesTo.stores[0] : null;
}

type Get = (path: string, query?: Record<string, any>) => Promise<any>;

export async function fetchOffers(get: Get, { storeId, includeScheduled = true }: { storeId?: string | null; includeScheduled?: boolean } = {}): Promise<Offer[]> {
    const query: Record<string, any> = {};
    if (includeScheduled) query.include = 'scheduled';
    if (storeId) query.store = storeId;
    const json = await get('promotions', query);
    return (Array.isArray(json) ? json : []).map(parseOffer).filter((offer) => offer.id);
}

export async function fetchOffer(get: Get, id: string): Promise<Offer> {
    return parseOffer(await get(`promotions/${encodeURIComponent(id)}`));
}
