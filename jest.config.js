module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    'jest-extended'
  ],
  coveragePathIgnorePatterns: [
  ],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@share/(.*)': '<rootDir>/src/share/$1',
    '@main/(.*)': '<rootDir>/src/main/$1',
    '@fe/(.*)': '<rootDir>/src/renderer/$1',
    "^lodash-es$": "lodash"
  }
};
