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
