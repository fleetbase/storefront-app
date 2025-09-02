import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faMagnifyingGlass, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import { Test } from './stacks/CoreStack';
import TestScreen from '../screens/TestScreen';
import TestLayout from '../layouts/TestLayout';

const isAndroid = Platform.OS === 'android';

const createTestScreenOption = ({ route }) => {
    const params = route.params || {};
    const title = params.text ?? 'Hello World';
    const count = params.count ?? 0;

    return {
        headerShown: false,
        title: `${title}: ${count}`,
    };
};

export const TestStack = createNativeStackNavigator({
    initialRouteName: 'Test',
    screens: {
        ModalTest: {
            screen: TestScreen,
            options: ({ route }) => {
                return { presentation: 'modal', ...createTestScreenOption({ route }) };
            },
        },
        Test: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        WhiteTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        BlueTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        RedTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        GreenTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        YellowTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        OrangeTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        BrownTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        PinkTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
        BlackTest: {
            screen: TestScreen,
            options: createTestScreenOption,
        },
    },
});

export const TestTabNavigatorStack = createBottomTabNavigator({
    layout: TestLayout,
    screenOptions: ({ route, navigation }) => {
        const inactiveColor = '#9ca3af';
        const activeColor = '#1f2937';
        const background = 'blur';

        return {
            headerShown: false,
            tabBarBackground: () => {
                if (!isAndroid && background === 'blur') {
                    return (
                        <View style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}>
                            <BlurView tint='light' blurAmount={6} style={StyleSheet.absoluteFill} />
                        </View>
                    );
                }

                return (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            { width: '100%', height: '100%', backgroundColor: '#111827', borderColor: '#374151', borderTopWidth: isAndroid ? 0 : 1, borderWidth: 0 },
                        ]}
                    />
                );
            },
            tabBarInactiveTintColor: inactiveColor,
            tabBarActiveTintColor: activeColor,
            tabBarStyle: {
                position: isAndroid ? 'relative' : 'absolute',
                backgroundColor: '#111827',
                borderTopWidth: isAndroid ? 0 : 1,
                borderTopColor: '#374151',
                elevation: 0,
            },
            tabBarIcon: ({ focused }) => {
                let icon;
                switch (route.name) {
                    case 'TestHomeTab':
                        icon = faHome;
                        break;
                    case 'TestSearchTab':
                        icon = faMagnifyingGlass;
                        break;
                    case 'TestCartTab':
                        icon = faShoppingCart;
                        break;
                    case 'TestProfileTab':
                        icon = faUser;
                        break;
                }

                return <FontAwesomeIcon icon={icon} size={20} color={focused ? activeColor : inactiveColor} />;
            },
            tabBarLabelStyle: ({ focused }) => {
                return {
                    marginTop: isAndroid ? 5 : 15,
                    fontSize: 15,
                    fontWeight: focued ? 600 : 300,
                };
            },
        };
    },
    screens: {
        TestHomeTab: {
            screen: TestStack,
            options: {
                tabBarLabel: 'Home',
            },
        },
        TestSearchTab: {
            screen: TestStack,
            options: {
                tabBarLabel: 'Search',
            },
        },
        TestCartTab: {
            screen: TestStack,
            options: {
                tabBarLabel: 'Cart',
            },
        },
        TestProfileTab: {
            screen: TestStack,
            options: {
                tabBarLabel: 'Profile',
            },
        },
    },
});

export const TestTabNavigator = createStaticNavigation(TestTabNavigatorStack);

const TestNavigator = createStaticNavigation(TestStack);
export default TestNavigator;
