import React, { useState, useEffect, createRef } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSort, faFilter, faEllipsisH, faStar, faImage } from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { Store, Review } from '@fleetbase/storefront';
import { useMountedState, useLocale } from 'hooks';
import { sum, capitalize, logError, translate } from 'utils';
import { useResourceCollection, useStorage } from 'utils/Storage';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import FastImage from 'react-native-fast-image';
import ActionSheet from 'react-native-actions-sheet';
import Rating from 'ui/Rating';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const StoreReviewsWidget = ({ info, store, storeLocation, listVisible = false, wrapperStyle, containerStyle, onStartReviewPress }) => {
    const navigation = useNavigation();
    const storefront = useStorefront();
    const isMounted = useMountedState();
    const actionSheetRef = createRef();
    const [locale] = useLocale();

    const [reviews, setReviews] = useResourceCollection(`${store.id}_reviews`, Review, StorefrontAdapter);
    const [counts, setCounts] = useStorage(`${store.id}_review_counts`, {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [actionSheetAction, setActionSheetAction] = useState('filter');
    const [sort, setSortValue] = useState(null);
    const [filter, setFilterValue] = useState(null);

    const totalCount = sum(Object.values(counts));
    const colors = {
        5: 'bg-green-500',
        4: 'bg-green-300',
        3: 'bg-yellow-500',
        2: 'bg-yellow-300',
        1: 'bg-red-500',
    };

    const loadReviews = () => {
        setIsLoading(true);
        setIsRefreshing(isRefreshing);

        // get number of reviews
        storefront.reviews.count(store.id).then(setCounts).catch(logError);

        // get reviews for store
        store
            ?.getReviews({ limit: 3, sort: 'highest rated' })
            .then(setReviews)
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
                setIsRefreshing(false);
            });
    };

    const percentageOfTotal = (number) => {
        return number > 0 ? Math.round((number / totalCount) * 100) : 0;
    };

    const openFilterDialog = () => {
        setActionSheetAction('filter');

        actionSheetRef.current?.show();
    };

    const openSortDialog = () => {
        setActionSheetAction('sort');

        actionSheetRef.current?.show();
    };

    const setSort = (value) => {
        setSortValue(value);
        actionSheetRef.current?.hide();
    };

    const setFilter = (value) => {
        setFilterValue(value);
        actionSheetRef.current?.hide();
    };

    const getReviews = () => {
        let mutatetableReviews = [...reviews];

        if (filter) {
            mutatetableReviews = mutatetableReviews.filter((review) => {
                return review.getAttribute('rating') === filter;
            });
        }

        switch (sort) {
            case 'newest first':
            default:
                mutatetableReviews = mutatetableReviews.sort((currentReview, nextReview) => {
                    return currentReview.createdAt?.getTime() < nextReview.createdAt?.getTime();
                });
                break;
            case 'oldest first':
                mutatetableReviews = mutatetableReviews.sort((currentReview, nextReview) => {
                    return currentReview.createdAt?.getTime() > nextReview.createdAt?.getTime();
                });
                break;
            case 'highest rated':
                mutatetableReviews = mutatetableReviews.sort((currentReview, nextReview) => {
                    return currentReview.getAttribute('rating') < nextReview.getAttribute('rating');
                });
                break;
            case 'lowest rated':
                mutatetableReviews = mutatetableReviews.sort((currentReview, nextReview) => {
                    return currentReview.getAttribute('rating') > nextReview.getAttribute('rating');
                });
                break;
        }

        return mutatetableReviews;
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadReviews();
        });

        return unsubscribe;
    }, [isMounted]);

    return (
        <View style={[wrapperStyle]}>
            <View style={[tailwind('bg-white'), containerStyle]}>
                <View style={tailwind('px-4 pt-4 pb-2')}>
                    <Text style={tailwind('font-bold text-lg text-black mb-2')}>{translate('components.widgets.StoreReviewsWidget.title')}</Text>
                </View>
                <View style={tailwind('p-4')}>
                    <View style={tailwind('flex flex-row')}>
                        <View style={tailwind('w-2/5 flex justify-center')}>
                            <Text style={tailwind('text-base font-semibold mb-2')}>{translate('components.widgets.StoreReviewsWidget.overallRating')}</Text>
                            <View style={tailwind('mb-2 flex flex-row items-start')}>
                                <Rating value={store.getAttribute('rating')} size={24} readonly={true} />
                            </View>
                            <Text style={tailwind('text-gray-600 text-lg')}>
                                {totalCount} {totalCount === 1 ? translate('components.widgets.StoreReviewsWidget.review') : translate('components.widgets.StoreReviewsWidget.reviews')}
                            </Text>
                        </View>
                        <View style={tailwind('flex-1')}>
                            {Object.keys(counts)
                                .sort((a, b) => a < b)
                                .map((rating) => (
                                    <View key={`rating_${rating}`} style={tailwind('flex flex-row mb-2')}>
                                        <View style={tailwind('w-8')}>
                                            <Text style={tailwind('font-bold')}>{rating}</Text>
                                        </View>
                                        <View style={tailwind('flex-1')}>
                                            <View style={tailwind('rounded-full bg-gray-200 w-full h-3 relative')}>
                                                <View style={[tailwind(`rounded-full ${colors[rating]} h-3`), { width: `${percentageOfTotal(counts[rating])}%` }]}>
                                                    <Text style={tailwind('absolute z-20 pl-1 text-xs hidden')}>{counts[rating]}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                        </View>
                    </View>
                    <TouchableOpacity onPress={onStartReviewPress} style={tailwind('btn rounded-md bg-blue-500 px-4 py-3 shadow-sm mt-4')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-white font-semibold')}>{translate('components.widgets.StoreReviewsWidget.writeAReview')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {!listVisible && getReviews().length > 0 && (
                    <View style={tailwind('p-4 border-t border-b border-gray-100')}>
                        <View style={tailwind('flex flex-row flex-wrap')}>
                            <View style={tailwind('pr-2')}>
                                <TouchableOpacity
                                    onPress={openSortDialog}
                                    style={[tailwind(`btn border ${sort ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} rounded-full px-4 py-2`), { width: 'auto' }]}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faSort} size={12} style={tailwind('text-gray-600 mr-1')} />
                                        <Text style={tailwind(`${sort ? 'text-blue-500' : 'text-gray-900'} font-semibold`)}>
                                            {sort ? capitalize(sort) : translate('components.widgets.StoreReviewsWidget.sort')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View>
                                <TouchableOpacity
                                    onPress={openFilterDialog}
                                    style={[tailwind(`btn border ${filter ? 'border-green-300 bg-green-50' : 'border-gray-200'} rounded-full px-4 py-2`), { width: 'auto' }]}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <FontAwesomeIcon icon={faFilter} size={10} style={tailwind('text-gray-600 mr-1')} />
                                        <Text style={tailwind(`${filter ? 'text-green-600' : 'text-gray-900'} font-semibold`)}>
                                            {filter ? translate('components.widgets.StoreReviewsWidget.starRatings', { filter }) : translate('components.widgets.StoreReviewsWidget.filter')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                {!listVisible && (
                    <ScrollView
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadReviews(true)} />}>
                        {getReviews().map((review, index) => (
                            <View key={review?.id ?? index} style={tailwind('flex w-full px-5 py-4')}>
                                <View style={tailwind('flex flex-row')}>
                                    <View style={tailwind('flex flex-row items-center flex-1 mb-3')}>
                                        <View style={tailwind('mr-3')}>
                                            <FastImage source={{ uri: review.getAttribute('customer.photo_url') }} style={tailwind('bg-gray-300 rounded-full w-10 h-10')} />
                                        </View>
                                        <View style={tailwind('flex-1 flex justify-center')}>
                                            <Text style={tailwind('font-semibold mb-1')}>{review.getAttribute('customer.name')}</Text>
                                            <View style={tailwind('flex flex-row')}>
                                                <View style={tailwind('flex flex-row mr-2 items-center')}>
                                                    <View style={tailwind('mr-1')}>
                                                        <FontAwesomeIcon icon={faStar} size={13} style={tailwind('text-gray-500')} />
                                                    </View>
                                                    <Text style={tailwind('text-gray-500 text-sm')}>{review.getAttribute('customer.reviews_count')}</Text>
                                                </View>
                                                <View style={tailwind('flex flex-row items-center')}>
                                                    <View style={tailwind('mr-1')}>
                                                        <FontAwesomeIcon icon={faImage} size={13} style={tailwind('text-gray-500')} />
                                                    </View>
                                                    <Text style={tailwind('text-gray-500 text-sm')}>{review.getAttribute('customer.uploads_count')}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <View style={tailwind('flex flex-row items-center mb-2')}>
                                    <Rating value={review.getAttribute('rating')} size={16} readonly={true} />
                                    <Text style={tailwind('text-gray-400 text-xs ml-2')}>
                                        {translate('components.widgets.StoreReviewsWidget.createdAgo', {
                                            reviewCreatedAgo: formatDistanceToNow(new Date(review.getAttribute('created_at'))),
                                        })}
                                    </Text>
                                </View>
                                <View style={tailwind('flex flex-row items-center')}>
                                    <Text numberOfLines={4} style={tailwind('text-gray-900 text-sm')}>
                                        {review.getAttribute('content')}
                                    </Text>
                                </View>
                                <View style={tailwind(`flex flex-row flex-wrap ${review.getAttribute('photos') ? 'mt-4' : ''}`)}>
                                    {review.getAttribute('photos')?.map((photo, index) => (
                                        <View key={index} style={tailwind('mr-2 mb-2')}>
                                            <FastImage source={{ uri: photo.url }} style={tailwind('w-24 h-24 z-10')} />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
            <ActionSheet
                containerStyle={[{ height: dialogHeight + 150 }]}
                gestureEnabled={true}
                bounceOnOpen={true}
                nestedScrollEnabled={true}
                onMomentumScrollEnd={() => actionSheetRef.current?.handleChildScrollEnd()}
                ref={actionSheetRef}>
                <View>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-lg font-semibold')}>{translate('Shared.StoreReviewScreen.actionSheetTitle', { action: capitalize(actionSheetAction) })}</Text>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                        {actionSheetAction === 'filter' && (
                            <View>
                                {Object.keys(counts)
                                    .reverse()
                                    .map((rating) => (
                                        <View key={rating} style={tailwind('flex flex-row border-b border-gray-100')}>
                                            <TouchableOpacity onPress={() => setFilter(rating)} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                                <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.filterOptionText', { rating })}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                <View style={tailwind('flex flex-row')}>
                                    <TouchableOpacity onPress={() => setFilter(null)} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.allRatings')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {actionSheetAction === 'sort' && (
                            <View>
                                <View style={tailwind('flex flex-row border-b border-gray-100')}>
                                    <TouchableOpacity onPress={() => setSort('newest first')} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.newestFirst')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex flex-row w-full border-b border-gray-100')}>
                                    <TouchableOpacity onPress={() => setSort('oldest first')} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.oldestFirst')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex flex-row w-full border-b border-gray-100')}>
                                    <TouchableOpacity onPress={() => setSort('highest rated')} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.highestRated')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex flex-row w-full border-b border-gray-100')}>
                                    <TouchableOpacity onPress={() => setSort('lowest rated')} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{translate('Shared.StoreReviewScreen.lowestRated')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex flex-row w-full')}>
                                    <TouchableOpacity onPress={() => setSort(null)} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                        <Text style={tailwind('text-blue-500 font-semibold text-lg')}>
                                            {translate('Shared.StoreReviewScreen.defaultSortOption', { networkName: info.name })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <View style={tailwind('w-full h-40')}></View>
                    </ScrollView>
                </View>
            </ActionSheet>
        </View>
    );
};

export default StoreReviewsWidget;
