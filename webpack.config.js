const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: './index.web.tsx',
    resolve: {
        extensions: ['.web.js', '.js', '.jsx', '.tsx', '.ts', '.mjs'],
        alias: {
            'react-native$': 'react-native-web',
        },
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                        plugins: [],
                    },
                },
            },
        ],
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'dist'),
        },
        compress: true,
        port: 8080,
        hot: true,
    },
    plugins: [
        new webpack.DefinePlugin({
            __DEV__: JSON.stringify(true),
        }),
    ],
};
