// Test to verify Vehicle instantiation issue

// The problem: VehicleMarker is not rendering because Vehicle instantiation might be failing

// In FoodTruckScreen.tsx line 401:
// vehicle={new Vehicle(foodTruck.vehicle, fleetbaseAdapter)}

// foodTruck.vehicle data structure from console:
const vehicleData = {
    id: 'vehicle_vM3dTUi',
    internal_id: null,
    photo_url: 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/vehicle-placeholder.png',
    avatar_url: 'https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/vehicle-icons/light_commercial_van.svg',
    name: '2018 Kia BONGO 2',
    description: null,
    driver: null,
    make: 'Kia',
    model: 'BONGO 2',
    location: {
        coordinates: [106.898928, 47.9167609],
        type: 'Point'
    }
};

// When Vehicle is instantiated with this data:
// const vehicle = new Vehicle(vehicleData, fleetbaseAdapter);

// Then in VehicleMarker.tsx:
// vehicle.getAttribute('location.coordinates.1')  // Should return 47.9167609 (latitude)
// vehicle.getAttribute('location.coordinates.0')  // Should return 106.898928 (longitude)

// POTENTIAL ISSUES:
// 1. Vehicle constructor might be throwing an error (silently caught?)
// 2. fleetbaseAdapter might be undefined
// 3. getAttribute might not work with nested array access like 'location.coordinates.1'
// 4. The component might be failing to render due to error boundary

// SOLUTION: Add error boundary or try-catch around Vehicle instantiation
// OR: Extract coordinates before passing to VehicleMarker
