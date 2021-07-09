import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';
import { Platform } from 'react-native';
import { checkMultiple, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { set, get } from './storage';
import { GoogleAddress } from '@fleetbase/sdk';
import haversine from './haversine';
import axios from 'axios';

const { GOOGLE_MAPS_KEY } = Config;
const isAndroid = Platform.OS === 'android';

const geocode = (latitude, longitude) => {
    return new Promise((resolve) => {
        return axios({
            method: 'get',
            url: `https://maps.googleapis.com/maps/api/geocode/json`,
            params: {
                latlng: `${latitude},${longitude}`,
                sensor: false,
                language: 'en-US',
                key: GOOGLE_MAPS_KEY,
            },
        }).then((response) => {
            const result = response.data.results[0];

            if (!result) {
                return resolve(null);
            }

            resolve(new GoogleAddress(result));
        });
    });
};

const checkHasLocationPermission = () => {
    return new Promise((resolve) => {
        return checkMultiple([PERMISSIONS.IOS.LOCATION_WHEN_IN_USE, PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]).then((statuses) => {
            if (isAndroid && statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.DENIED) {
                request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((result) => {
                    resolve(result === 'granted');
                });
            }

            if (!isAndroid && statuses[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.DENIED) {
                request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then((result) => {
                    resolve(result === 'granted');
                });
            }

            resolve(true);
        });
    });
};

const getCurrentLocation = async () => {
    const hasLocationPermission = await checkHasLocationPermission();
    const lastLocation = get('location');

    if (hasLocationPermission) {
        return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    // if a location is stored and user is not more then 5km in distance from previous stored location skip geocode
                    if (lastLocation && haversine([latitude, longitude], lastLocation.coordinates) > 5) {
                        resolve(lastLocation);
                    }

                    geocode(latitude, longitude).then((googleAddress) => {
                        if (!googleAddress) {
                            resolve(position);
                        }

                        googleAddress.setAttribute('position', position);

                        // save last known location
                        set('location', googleAddress.all());

                        resolve(googleAddress.all());
                    });
                },
                (error) => {
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        });
    }
};

const getLocation = () => {
    const location = get('location');

    if (!location) {
        return null;
    }

    return location;
};

export default getCurrentLocation;

export { checkHasLocationPermission, geocode, getLocation };
