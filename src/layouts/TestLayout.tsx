import { View } from 'react-native';

const TestLayout = ({ children }) => {
    return <View style={{ width: '100%', height: '100%', flex: 1 }}>{children}</View>;
};

export default TestLayout;
