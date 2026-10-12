// Every tool that compiles the app (Metro, webpack, Jest, the Tamagui compiler) loads this
// file first, so the brand/ lookup is refreshed before any module resolves it.
require('./scripts/link-brand').linkBrand(__dirname);

module.exports = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
        'preval',
        '@babel/plugin-proposal-export-namespace-from',
        'react-native-reanimated/plugin',
        'babel-plugin-transform-flow-strip-types',
        [
            '@tamagui/babel-plugin',
            {
                components: ['tamagui'],
                config: './tamagui.config.ts',
            },
        ],
    ],
};
