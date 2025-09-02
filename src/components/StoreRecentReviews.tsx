import { useState, useEffect, useMemo } from 'react';
import { YStack } from 'tamagui';
import { Review } from '@fleetbase/storefront';
import useStorage from '../hooks/use-storage';
import { adapter } from '../hooks/use-storefront';
import CustomerReview from './CustomerReview';

const StoreRecentReviews = ({ store }) => {
    const [loaded, setLoaded] = useState(false);
    const [data, setData] = useStorage(`${store.id}_recent_reviews`, []);
    const reviews = useMemo(() => {
        return data.map((review) => new Review(review, adapter));
    }, [data]);

    useEffect(() => {
        if (!store || loaded === true) return;

        const getRecentReviews = async () => {
            try {
                const reviews = await store.getReviews({ limit: 3 });
                const serializedReviews = reviews.map((review) => review.serialize());
                setData(serializedReviews);
                setLoaded(true);
            } catch (err) {
                console.error('Error loading review for store:', err);
            }
        };

        getRecentReviews();
    }, [store]);

    return (
        <YStack>
            {reviews.map((review) => (
                <CustomerReview key={review.id} review={review} />
            ))}
        </YStack>
    );
};

export default StoreRecentReviews;
