/**
 *  Utility class for performing calculations.
 *
 * @export
 * @class CalculateUtil
 */
export default class CalculateUtil {
    /**
     * Calculate the percentage from a number.
     *
     * @static
     * @param {Integer} percentage
     * @param {Integer} number
     * @return {Integer}
     * @memberof CalculateUtil
     */
    static percentage(percentage, number) {
        return (percentage / 100) * number;
    }

    /**
     * Calculates the haversine distance between point A, and B.
     *
     * @static
     * @param {number[]} latlngA [lat, lng] point A
     * @param {number[]} latlngB [lat, lng] point B
     * @param {boolean} isMiles If we are using miles, else km.
     * @memberof CalculateUtil
     */
    static haversine([lat1, lon1], [lat2, lon2], isMiles = false) {
        const toRadian = (angle) => (Math.PI / 180) * angle;
        const distance = (a, b) => (Math.PI / 180) * (a - b);
        const RADIUS_OF_EARTH_IN_KM = 6371;

        const dLat = distance(lat2, lat1);
        const dLon = distance(lon2, lon1);

        lat1 = toRadian(lat1);
        lat2 = toRadian(lat2);

        // Haversine Formula
        const a = Math.pow(Math.sin(dLat / 2), 2) + Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.asin(Math.sqrt(a));

        let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

        if (isMiles) {
            finalDistance /= 1.60934;
        }

        return finalDistance;
    }
}

const calculatePercentage = CalculateUtil.percentage;
const haversine = CalculateUtil.haversine;

export { calculatePercentage, haversine };
