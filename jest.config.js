module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
    // React Navigation ships ES modules; the web linking tests use its path parser.
    transformIgnorePatterns: ['/node_modules/(?!(@react-navigation|query-string|decode-uri-component|split-on-first|filter-obj)/)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    // Coverage of the modules the tests load. Instrumenting every file under src/ took over
    // ten minutes in a single CI worker, so untested screens aren't counted.
    coveragePathIgnorePatterns: ['/node_modules/', '/src/generated/'],
    coverageReporters: ['lcov', 'text-summary'],
};
