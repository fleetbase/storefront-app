module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    // Coverage is measured over the whole app, not only the files the tests happen to load,
    // so the number reflects how much of the app is tested.
    collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/generated/**', '!src/**/*.d.ts'],
    coverageReporters: ['lcov', 'text-summary'],
};
