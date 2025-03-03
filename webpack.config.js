require('dotenv').config();

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { TamaguiPlugin } = require('tamagui-loader');
const { DefinePlugin, ProvidePlugin } = webpack;

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
            'react-native-linear-gradient': 'react-native-web-linear-gradient',
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
        }),
        new ProvidePlugin({
            process: 'process/browser',
        }),
        new DefinePlugin({
            __DEV__: JSON.stringify(true),
            'process.env.APP_NAME': JSON.stringify(process.env.APP_NAME),
            'process.env.APP_IDENTIFIER': JSON.stringify(process.env.APP_IDENTIFIER),
            'process.env.APP_LINK_PREFIX': JSON.stringify(process.env.APP_LINK_PREFIX),
            'process.env.SOCKETCLUSTER_HOST': JSON.stringify(process.env.SOCKETCLUSTER_HOST),
            'process.env.SOCKETCLUSTER_PORT': JSON.stringify(process.env.SOCKETCLUSTER_PORT),
            'process.env.SOCKETCLUSTER_SECURE': JSON.stringify(process.env.SOCKETCLUSTER_SECURE),
            'process.env.FLEETBASE_HOST': JSON.stringify(process.env.FLEETBASE_HOST),
            'process.env.FLEETBASE_KEY': JSON.stringify(process.env.FLEETBASE_KEY),
            'process.env.STOREFRONT_KEY': JSON.stringify(process.env.STOREFRONT_KEY),
            'process.env.STRIPE_KEY': JSON.stringify(process.env.STRIPE_KEY),
        }),
        new HtmlWebpackPlugin({ title: process.env.APP_NAME, template: path.resolve(__dirname, 'public/index.html') }),
    ],
};
