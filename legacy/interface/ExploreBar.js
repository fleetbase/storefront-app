import React, { useState, useEffect, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faTimesCircle, faSort, faFilter, faMapMarked } from '@fortawesome/free-solid-svg-icons';
import { translate, capitalize } from 'utils';
import { useMountedState } from 'hooks';
import ActionSheet from 'react-native-actions-sheet';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const ExploreBar = ({
    onSort,
    onFilter,
    onToggleMap,
    filterOptions,
    wrapperStyle,
    containerStyle,
    scrollContainerStyle,
    isLoading,
    hideMapButon,
    hideSortButton,
    hideFilterButton,
    tagged,
}) => {
    const actionSheetRef = createRef();

    // default filter options
    filterOptions = filterOptions ?? [];

    const [currentAction, setCurrentAction] = useState('sort');
    const [sort, setSortValue] = useState(null);
    // const [filter, setFilterValue] = useState(null);
    const [selectedFilters, setSelectedFilters] = useState(tagged ?? []);

    // Sort Options: Nearest, Highest Rated, Lowest Rated, Newest, Oldest, Most Popular
    const sortOptions = [
        {
            label: translate('components.interface.ExploreBar.nearestFirst'),
            value: 'nearest',
        },
        {
            label: translate('components.interface.ExploreBar.highestRated'),
            value: 'highest_rated',
        },
        {
            label: translate('components.interface.ExploreBar.lowestRated'),
            value: 'lowest_rated',
        },
        {
            label: translate('components.interface.ExploreBar.newestFirst'),
            value: 'newest',
        },
        {
            label: translate('components.interface.ExploreBar.oldestFirst'),
            value: 'oldest',
        },
        {
            label: translate('components.interface.ExploreBar.mostPopular'),
            value: 'popular',
        },
        {
            label: translate('components.interface.ExploreBar.trending'),
            value: 'trending',
        },
    ];

    const currentSort = sortOptions.find((sortOption) => sortOption.value === sort);

    const openFilterDialog = () => {
        setCurrentAction('filter');
        actionSheetRef.current?.show();
    };

    const openSortDialog = () => {
        setCurrentAction('sort');
        actionSheetRef.current?.show();
    };

    const setSort = (value) => {
        setSortValue(value);

        if (typeof onSort === 'function') {
            onSort(value);
        }

        actionSheetRef.current?.hide();
    };

    const setFilter = (value) => {
        const filters = [...selectedFilters];

        if (filters.includes(value)) {
            const index = filters.find((f) => f === value);
            filters.splice(index, 1);
        } else {
            filters.push(value);
        }

        setSelectedFilters(filters);

        if (typeof onFilter === 'function') {
            onFilter(filters);
        }

        actionSheetRef.current?.hide();
    };

    const clearFilters = () => {
        setSelectedFilters([]);

        if (typeof onFilter === 'function') {
            onFilter([]);
        }

        actionSheetRef.current?.hide();
    };

    useEffect(() => {
        setSelectedFilters(tagged);
    }, [tagged]);

    return (
        <View style={[wrapperStyle]}>
            <ScrollView horizontal={true} style={[tailwind('border-b border-gray-200'), scrollContainerStyle]}>
                <View style={[tailwind('py-2 px-4 h-14 flex flex-row items-center'), containerStyle]}>
                    {isLoading && <ActivityIndicator style={tailwind('mr-2')} />}
                    {!hideSortButton && (
                        <View style={tailwind('pr-2')}>
                            <TouchableOpacity
                                onPress={openSortDialog}
                                style={[tailwind(`btn border ${sort ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} rounded-full px-4 py-2`), { width: 'auto' }]}
                            >
                                <View style={tailwind('flex flex-row items-center')}>
                                    <FontAwesomeIcon icon={faSort} size={12} style={tailwind('text-gray-600 mr-1')} />
                                    <Text style={tailwind(`${sort ? 'text-blue-500' : 'text-gray-900'} font-semibold`)}>
                                        {translate('terms.sort')} {currentSort ? `(${currentSort.label})` : ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    {!hideFilterButton && (
                        <View style={tailwind('pr-2')}>
                            <TouchableOpacity
                                onPress={openFilterDialog}
                                style={[tailwind(`btn border ${selectedFilters.length ? 'border-green-300 bg-green-50' : 'border-gray-200'} rounded-full px-4 py-2`), { width: 'auto' }]}
                            >
                                <View style={tailwind('flex flex-row items-center')}>
                                    <FontAwesomeIcon icon={faFilter} size={10} style={tailwind('text-gray-600 mr-1')} />
                                    <Text style={tailwind(`${selectedFilters.length ? 'text-green-600' : 'text-gray-900'} font-semibold`)}>{translate('terms.filter')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    {!hideMapButon && (
                        <View style={tailwind('pr-2')}>
                            <TouchableOpacity onPress={onToggleMap} style={[tailwind(`btn border border-gray-200 rounded-full px-4 py-2`), { width: 'auto' }]}>
                                <View style={tailwind('flex flex-row items-center')}>
                                    <FontAwesomeIcon icon={faMapMarked} size={12} style={tailwind('text-gray-600 mr-1')} />
                                    <Text style={tailwind(`text-gray-900 font-semibold`)}>{translate('components.interface.ExploreBar.map')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
            <ActionSheet
                containerStyle={[{ height: dialogHeight + 150 }]}
                gestureEnabled={true}
                bounceOnOpen={true}
                nestedScrollEnabled={true}
                onMomentumScrollEnd={() => actionSheetRef.current?.handleChildScrollEnd()}
                ref={actionSheetRef}
            >
                <View>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-lg font-semibold')}>{capitalize(currentAction)}</Text>
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
                        {currentAction === 'filter' && (
                            <View>
                                <View style={tailwind('flex flex-row mx-3')}>
                                    <TouchableOpacity onPress={clearFilters} style={tailwind(`flex flex-row px-3 py-2 border bg-red-100 border-red-400 rounded-md mb-3`)}>
                                        <FontAwesomeIcon icon={faTimesCircle} style={tailwind('text-red-500 mr-1')} />
                                        <Text>{translate('components.interface.ExploreBar.clearAllFilters')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={tailwind('flex flex-row flex-wrap mx-3')}>
                                    {filterOptions?.map((filterOption, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => setFilter(filterOption)}
                                            style={tailwind(
                                                `px-3 py-2 border ${
                                                    selectedFilters.includes(filterOption) ? 'bg-blue-100 border-blue-400' : 'bg-gray-50 border-gray-200'
                                                } rounded-lg mx-1 my-1.5`
                                            )}
                                        >
                                            <Text>{filterOption}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                        {currentAction === 'sort' && (
                            <View>
                                {sortOptions.map((sortOption, index) => (
                                    <View key={index} style={tailwind('flex flex-row border-b border-gray-100')}>
                                        <TouchableOpacity onPress={() => setSort(sortOption.value)} style={tailwind('px-4 py-5 flex flex-row items-center justify-start w-full')}>
                                            <Text style={tailwind('text-blue-500 font-semibold text-lg')}>{sortOption.label}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View style={tailwind('w-full h-40')}></View>
                    </ScrollView>
                </View>
            </ActionSheet>
        </View>
    );
};

export default ExploreBar;
