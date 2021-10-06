import Geolocation from 'react-native-geolocation-service';
import { Platform } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { checkMultiple, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { GoogleAddress, Place } from '@fleetbase/sdk';
import { set, get } from './Storage';
import { isAndroid } from './Helper';
import { haversine } from './Calculate';
import axios from 'axios';
import config from 'config';

const { GOOGLE_MAPS_KEY } = config;
const { emit } = EventRegister;

/**
 *  Utility class for performing calculations.
 *
 * @export
 * @class GeoUtil
 */
export default class GeoUtil {
    /**
     * Creates a new google address instance.
     *
     * @static
     * @return {GoogleAddress} 
     * @memberof GeoUtil
     */
    static createGoogleAddress() {
        return new GoogleAddress(...arguments);
    }

    /**
     * Reverse geocodes coordinates into a GoogleAddress instance, which
     * will resolve from a Promise.
     *
     * @static
     * @param {string|number} latitude
     * @param {string|number} longitude
     * @return {Promise} 
     * @memberof GeoUtil
     */
    static geocode(latitude, longitude) {
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
    }

    /**
     * Checks to see if device has geolocation permissions.
     *
     * @static
     * @return {Promise} 
     * @memberof GeoUtil
     */
    static checkHasLocationPermission() {        
        return new Promise((resolve) => {
            return checkMultiple([PERMISSIONS.IOS.LOCATION_WHEN_IN_USE, PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]).then((statuses) => {
                if (isAndroid && statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.DENIED) {
                    return request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((result) => {
                        resolve(result === 'granted');
                    });
                }

                if (!isAndroid && statuses[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.DENIED) {
                    return request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then((result) => {
                        resolve(result === 'granted');
                    });
                }

                resolve(true);
            });
        });
    }

    /**
     * If the correct permissions are set, will resolve the current location of device via Promise.
     *
     * @static
     * @return {Promise} 
     * @memberof GeoUtil
     */
    static async getCurrentLocation() {
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
                            emit('location.changed', Place.fromGoogleAddress(googleAddress));

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
    }

    /**
     * Get the current stored location for device/user.
     *
     * @static
     * @return {object} 
     * @memberof GeoUtil
     */
    static getLocation() {
        const location = get('location');

        if (!location) {
            return null;
        }

        return location;
    }
}

const checkHasLocationPermission = GeoUtil.checkHasLocationPermission;
const geocode = GeoUtil.geocode;
const getCurrentLocation = GeoUtil.getCurrentLocation;
const getLocation = GeoUtil.getLocation;

export { checkHasLocationPermission, geocode, getLocation, getCurrentLocation };
