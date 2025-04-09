module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  verbose: true,
  testTimeout: 10000,
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>/src']
};
