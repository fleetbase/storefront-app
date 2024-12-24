import TabSwitch from './TabSwitch';

const CheckoutPickupSwitch = ({ onChange }) => {
    const receivingOptions = [
        { label: 'Delivery', value: 'delivery' },
        { label: 'Pickup', value: 'pickup' },
    ];

    const handleTabChange = (value) => {
        const isPickup = value === 'pickup';
        if (typeof onChange === 'function') {
            onChange(isPickup);
        }
    };

    return <TabSwitch options={receivingOptions} onTabChange={handleTabChange} />;
};

export default CheckoutPickupSwitch;
