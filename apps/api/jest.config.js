module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  setupFiles: ['reflect-metadata'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!main.ts', '!database/migrations/**'],
  coverageDirectory: '../coverage',
};
