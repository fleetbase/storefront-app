export function percentage(percentage, number) {
    return (percentage / 100) * number;
}

export function haversine([lat1, lon1], [lat2, lon2], unit = 'meters') {
    const toRadian = (angle) => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_M = 6371000; // Earth's radius in meters

    const dLat = distance(lat2, lat1);
    const dLon = distance(lon2, lon1);

    lat1 = toRadian(lat1);
    lat2 = toRadian(lat2);

    // Haversine Formula
    const a = Math.pow(Math.sin(dLat / 2), 2) + Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.asin(Math.sqrt(a));

    let finalDistance = RADIUS_OF_EARTH_IN_M * c;

    if (unit === 'kilometers') {
        finalDistance /= 1000; // Convert meters to kilometers
    } else if (unit === 'miles') {
        finalDistance /= 1609.34; // Convert meters to miles
    }

    return finalDistance;
}
