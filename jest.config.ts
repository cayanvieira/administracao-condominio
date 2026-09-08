import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', { useESM: true, tsconfig: './tsconfig.test.json' }],
  },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  clearMocks: true,
}

export default config