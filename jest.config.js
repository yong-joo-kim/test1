/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/domains/ticket/**/*.ts', '!src/domains/ticket/**/__tests__/**'],
  coverageThreshold: {
    'src/domains/ticket/ticket.statemachine.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
