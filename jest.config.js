module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    // Coverage of the modules the tests load. Instrumenting every file under src/ took over
    // ten minutes in a single CI worker, so untested screens aren't counted.
    coveragePathIgnorePatterns: ['/node_modules/', '/src/generated/'],
    coverageReporters: ['lcov', 'text-summary'],
};
