import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faImage } from '@fortawesome/free-solid-svg-icons';
import Rating from './StoreRating';
import Image from './Image';

const CustomerReview = ({ review, index }) => {
    const theme = useTheme();

    return (
        <YStack>
            <XStack>
                <XStack flex={1} alignItems='center' mb='$3'>
                    <YStack mr='$3'>
                        <Image source={{ uri: review.getAttribute('customer.photo_url') }} width={40} height={40} borderRadius={9999} backgroundColor='$gray-300' />
                    </YStack>
                    <YStack flex={1} justifyContent='center'>
                        <Text fontWeight='bold' mb='$1'>
                            {review.getAttribute('customer.name')}
                        </Text>
                        <XStack>
                            <XStack mr='$2' alignItems='center'>
                                <YStack mr='$1'>
                                    <FontAwesomeIcon icon={faStar} size={13} color={theme.textSecondary.val} />
                                </YStack>
                                <Text color='$textSecondary' fontSize={12}>
                                    {review.getAttribute('customer.reviews_count')}
                                </Text>
                            </XStack>
                            <XStack alignItems='center'>
                                <YStack mr='$1'>
                                    <FontAwesomeIcon icon={faImage} size={13} color={theme.textSecondary.val} />
                                </YStack>
                                <Text color='$textSecondary' fontSize={12}>
                                    {review.getAttribute('customer.uploads_count')}
                                </Text>
                            </XStack>
                        </XStack>
                    </YStack>
                </XStack>
            </XStack>

            <XStack alignItems='center' mb='$2'>
                <Rating rating={review.getAttribute('rating')} size={15} readOnly={true} />
                <Text color='$gray-400' fontSize={10} ml='$2'>
                    {formatDistanceToNow(new Date(review.getAttribute('created_at')))} ago
                </Text>
            </XStack>

            <XStack alignItems='center'>
                <Text numberOfLines={4} color='$textPrimary' fontSize={14}>
                    {review.getAttribute('content')}
                </Text>
            </XStack>

            {review.getAttribute('photos') && (
                <XStack flexWrap='wrap' mt='$3' gap='$2'>
                    {review.getAttribute('photos').map((photo, idx) => (
                        <YStack key={idx} borderWidth={1} borderColor='$borderColor' borderRadius='$4'>
                            <Image source={{ uri: photo.url }} fallbackSource={require('../../assets/images/cannot-load.png')} width={96} height={96} zIndex={10} borderRadius='$4' />
                        </YStack>
                    ))}
                </XStack>
            )}
        </YStack>
    );
};

export default CustomerReview;
