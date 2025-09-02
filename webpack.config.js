require('dotenv').config();

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { TamaguiPlugin } = require('tamagui-loader');
const { DefinePlugin, ProvidePlugin } = webpack;

const generateConfig = () => {
    const STANDARD_KEYS = [
        'APP_NAME',
        'APP_IDENTIFIER',
        'APP_LINK_PREFIX',
        'SOCKETCLUSTER_HOST',
        'SOCKETCLUSTER_PORT',
        'SOCKETCLUSTER_SECURE',
        'FLEETBASE_HOST',
        'FLEETBASE_KEY',
        'STOREFRONT_KEY',
        'GOOGLE_MAPS_API_KEY',
        'STRIPE_KEY',
        'PAYMENT_GATEWAY',
        'TIP_INCREMENT',
        'MAP_DISPLAY_DRIVERS',
        'DEFAULT_COORDINATES',
        'STORE_NAVIGATOR_TABS',
        'STORE_NAVIGATOR_DEFAULT_TAB',
        'STORE_FOOD_TRUCK_TAB_ICON',
        'DEFAULT_SERVICE_AREA',
        'BOOTSCREEN_BACKGROUND_COLOR',
        'DEFAULT_LOCALE',
        'AVAILABLE_LOCALES',
        'PRIORITIZE_PICKUP',
        'STORE_CATEGORIES_DISPLAY',
        'PRODUCT_CARD_STYLE',
        'CUSTOM_COLORS',
        'STORE_NAVIGATOR_TAB_BAR_BG',
        'CUSTOM_TAB_BAR_ACTIVE_COLOR',
        'CUSTOM_TAB_BAR_INACTIVE_COLOR',
        'DEFAULT_MAP_TYPE',
        'TOS_URL',
        'PRIVACY_URL',
        'APPLE_LOGIN_ENABLED',
        'FACEBOOK_LOGIN_ENABLED',
        'GOOGLE_LOGIN_ENABLED',
    ];

    const config = STANDARD_KEYS.reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
    }, {});

    // Add locale-based keys.
    const AVAILABLE_LOCALES = (process.env.AVAILABLE_LOCALES || 'en').split(',');
    const LOCALE_ENV_VAR_KEYS = ['STORE_HOME_TAB_LABEL', 'STORE_SEARCH_TAB_LABEL', 'STORE_MAP_TAB_LABEL', 'STORE_CART_TAB_LABEL', 'STORE_PROFILE_TAB_LABEL', 'STORE_FOOD_TRUCK_TAB_LABEL'];

    AVAILABLE_LOCALES.forEach((locale) => {
        const uppercasedLocale = locale.toUpperCase();
        LOCALE_ENV_VAR_KEYS.forEach((key) => {
            const localeKey = `${key}_${uppercasedLocale}`;
            config[localeKey] = process.env[localeKey];
        });
    });

    return config;
};

module.exports = {
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    entry: [path.resolve(__dirname, 'index.web.tsx')],
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'public'),
        },
    },
    output: {
        filename: 'bundle.web.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                include: [
                    path.resolve(__dirname, 'index.web.tsx'),
                    path.resolve(__dirname, 'App.tsx'),
                    path.resolve(__dirname, 'App.web.tsx'),
                    path.resolve(__dirname, 'tamagui.config.ts'),
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'web'),
                ],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: [
                                ['@babel/preset-react', { plugins: ['@babel/plugin-proposal-class-properties'] }],
                                ['module:@react-native/babel-preset', { useTransformReactJSXExperimental: true }],
                                '@babel/preset-typescript',
                            ],
                            plugins: ['react-native-web'],
                        },
                    },
                    {
                        loader: 'tamagui-loader',
                        options: {
                            config: './tamagui.config.ts',
                            components: ['tamagui'],
                        },
                    },
                ],
            },
            {
                test: /\.(js|jsx)$/,
                include: [
                    path.resolve(__dirname, 'node_modules/react-native-linear-gradient'),
                    path.resolve(__dirname, 'node_modules/react-native-maps'),
                    path.resolve(__dirname, 'node_modules/react-native-super-grid'),
                    path.resolve(__dirname, 'node_modules/react-native-community-blur'),
                ],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-react', { plugins: ['@babel/plugin-proposal-class-properties'] }],
                            ['@babel/preset-env', { loose: true }],
                            'module:@react-native/babel-preset',
                            '@babel/preset-typescript',
                        ],
                        plugins: [
                            ['@babel/plugin-proposal-class-properties', { loose: true }],
                            ['@babel/plugin-transform-private-methods', { loose: true }],
                            ['@babel/plugin-transform-private-property-in-object', { loose: true }],
                            'react-native-web',
                            'babel-plugin-transform-flow-strip-types',
                        ],
                    },
                },
            },
            {
                test: /\.(js|jsx)$/,
                include: [path.resolve(__dirname, 'node_modules/@react-native')],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['module:@react-native/babel-preset'],
                        plugins: ['react-native-web'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(gif|jpe?g|png|svg)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        name: '[name].[ext]',
                        esModule: false,
                    },
                },
            },
        ],
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        fallback: {
            'process/browser': require.resolve('process/browser'),
        },
        alias: {
            'react-native$': 'react-native-web',
            'react-native-linear-gradient': path.resolve(__dirname, 'web/react-native-linear-gradient.web.js'),
            '@gorhom/bottom-sheet': path.resolve(__dirname, 'web/gorhom-bottom-sheet.web.js'),
            'react-native-maps': path.resolve(__dirname, 'web/react-native-maps.web.js'),
            'react-native-svg/css$': path.resolve(__dirname, 'web/react-native-svg-css.web.js'),
            'react-native-config': path.resolve(__dirname, 'web/react-native-config.web.js'),
            'react-native-device-info': path.resolve(__dirname, 'web/react-native-device-info.web.js'),
            'react-native-fast-image': path.resolve(__dirname, 'web/react-native-fast-image.web.js'),
            '@react-native-community/blur': path.resolve(__dirname, 'web/react-native-community-blur.web.js'),
            '@fleetbase/storefront': path.resolve(__dirname, 'node_modules/@fleetbase/storefront/dist/esm/storefront.js'),
            '@fleetbase/sdk': path.resolve(__dirname, 'node_modules/@fleetbase/sdk/dist/esm/fleetbase.js'),
        },
        extensions: ['.mjs', '.web.js', '.js', '.web.tsx', '.tsx', '.web.ts', '.ts'],
    },
    plugins: [
        new TamaguiPlugin({
            config: path.resolve(__dirname, 'tamagui.config.ts'),
            components: ['tamagui'],
            outputCSS: path.resolve(__dirname, 'public/tamagui.css'),
        }),
        new ProvidePlugin({
            process: 'process/browser',
        }),
        new DefinePlugin({
            __DEV__: JSON.stringify(true),
            CONFIG: JSON.stringify(generateConfig()),
        }),
        new HtmlWebpackPlugin({ title: process.env.APP_NAME, template: path.resolve(__dirname, 'public/index.html') }),
        {
            apply(compiler) {
                compiler.hooks.afterEmit.tapPromise('PostcssTamaguiFix', async (compilation) => {
                    const { execa } = await import('execa');
                    await execa('postcss', ['public/tamagui.css', '-o', 'public/tamagui.css']);
                });
            },
        },
    ],
};
