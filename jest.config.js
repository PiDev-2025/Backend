module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  verbose: true,
  testTimeout: 30000, // Increase Jest timeout to 30 seconds
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src'],
  globalSetup: './src/tests/setup.js'
};

