import { createReview, deleteReview, fetchEligibility, fetchRatingSummary, fetchReviews, parseEligibility, parseReview, ratingSummary, relativeTime } from '../../src/commerce/reviews';

const serverReview = {
    id: 'review_1',
    rating: '5',
    content: 'Gorgeous roses.',
    customer: { name: 'Hui Min T.', photo_url: 'https://cdn.test/static/no-avatar.png' },
    photos: [{ id: 'file_1', url: 'https://cdn.test/1.jpg' }, { id: 'file_2' }, { url: 'https://cdn.test/3.jpg' }],
    verified: true,
    is_mine: true,
    created_at: '2026-10-04T10:00:00Z',
};

describe('reviews', () => {
    test('parses a review', () => {
        expect(parseReview(serverReview)).toEqual({
            id: 'review_1',
            rating: 5,
            content: 'Gorgeous roses.',
            author: 'Hui Min T.',
            avatarUrl: null,
            photos: [
                { id: 'file_1', url: 'https://cdn.test/1.jpg' },
                { id: 'https://cdn.test/3.jpg', url: 'https://cdn.test/3.jpg' },
            ],
            verified: true,
            mine: true,
            createdAt: '2026-10-04T10:00:00Z',
        });
        expect(parseReview({ rating: 9, customer: { photo_url: 'https://cdn.test/me.jpg' } })).toMatchObject({ id: '', rating: 5, author: '', avatarUrl: 'https://cdn.test/me.jpg', verified: false, mine: false, createdAt: null });
        expect(parseReview(null).rating).toBe(0);
    });

    test('summarises star counts', () => {
        expect(ratingSummary({ 1: 3, 2: 5, 3: 10, 4: 34, 5: 212 })).toEqual({
            total: 264,
            average: 4.7,
            rows: [
                { star: 5, count: 212, percent: 80 },
                { star: 4, count: 34, percent: 13 },
                { star: 3, count: 10, percent: 4 },
                { star: 2, count: 5, percent: 2 },
                { star: 1, count: 3, percent: 1 },
            ],
        });
        expect(ratingSummary(null)).toMatchObject({ total: 0, average: null });
        expect(ratingSummary({ '5': 'x', '4': -2 }).total).toBe(0);
    });

    test('parses eligibility', () => {
        expect(parseEligibility({ can_review: true, reason: null, order: 'order_1' })).toEqual({ canReview: true, reason: null, orderId: 'order_1', reviewId: null });
        expect(parseEligibility({ can_review: false, reason: 'already_reviewed', review: 'review_1' })).toMatchObject({ canReview: false, reason: 'already_reviewed', reviewId: 'review_1' });
        expect(parseEligibility({ can_review: false, reason: 'new_reason' }).reason).toBe('unknown');
        expect(parseEligibility(undefined)).toEqual({ canReview: false, reason: null, orderId: null, reviewId: null });
    });

    test('calls the review endpoints', async () => {
        const request = jest.fn();
        request.mockResolvedValueOnce([serverReview, { id: '' }]);
        expect(await fetchReviews(request, { storeId: 'store_1', sort: 'highest' })).toHaveLength(1);
        request.mockResolvedValueOnce({ 5: 2 });
        expect((await fetchRatingSummary(request, 'store_1')).average).toBe(5);
        request.mockResolvedValueOnce({ can_review: true, order: 'order_9' });
        expect((await fetchEligibility(request, 'store_1', 'order_9')).orderId).toBe('order_9');
        request.mockResolvedValueOnce({ can_review: false, reason: 'sign_in_required' });
        await fetchEligibility(request, 'store_1');
        request.mockResolvedValueOnce(serverReview);
        await createReview(request, { subjectId: 'store_1', orderId: 'order_9', rating: 7, content: '  Lovely  ', photos: [1, 2, 3, 4, 5].map((n) => ({ data: `b64-${n}`, type: 'image/jpeg' })) });
        request.mockResolvedValueOnce(serverReview);
        await createReview(request, { subjectId: 'store_1', rating: 4, content: 'Fine' });
        request.mockResolvedValueOnce({ deleted: true });
        await deleteReview(request, 'review_1');
        request.mockResolvedValueOnce(null);
        expect(await fetchReviews(request, { storeId: 'store_1' })).toEqual([]);

        expect(request.mock.calls).toEqual([
            ['reviews', { store: 'store_1', sort: 'highest', limit: 20, offset: 0 }],
            ['reviews/count', { store: 'store_1' }],
            ['reviews/eligibility', { subject: 'store_1', order: 'order_9' }],
            ['reviews/eligibility', { subject: 'store_1' }],
            ['reviews', { subject: 'store_1', order: 'order_9', rating: 5, content: 'Lovely', files: [1, 2, 3, 4].map((n) => ({ data: `b64-${n}`, type: 'image/jpeg' })) }, 'POST'],
            ['reviews', { subject: 'store_1', rating: 4, content: 'Fine' }, 'POST'],
            ['reviews/review_1', {}, 'DELETE'],
            ['reviews', { store: 'store_1', sort: 'newest', limit: 20, offset: 0 }],
        ]);
    });

    test('describes how long ago a review was written', () => {
        const now = new Date('2026-10-07T10:00:00Z');
        expect(relativeTime('2026-10-05T10:00:00Z', now)).toBe('2 days ago');
        expect(relativeTime('2026-09-16T10:00:00Z', now)).toBe('3 weeks ago');
        expect(relativeTime('2026-10-07T09:59:50Z', now)).toBe('this minute');
        expect(relativeTime('nope', now)).toBeNull();
        expect(relativeTime(null, now)).toBeNull();

        const original = (Intl as any).RelativeTimeFormat;
        (Intl as any).RelativeTimeFormat = undefined;
        try {
            expect(relativeTime('2026-10-05T10:00:00Z', now)).toBe(new Date('2026-10-05T10:00:00Z').toLocaleDateString('en'));
        } finally {
            (Intl as any).RelativeTimeFormat = original;
        }
    });
});
