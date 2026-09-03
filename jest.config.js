module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
