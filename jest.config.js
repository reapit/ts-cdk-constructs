/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // silent: true, // uncomment this to get console.log
  preset: 'ts-jest',
  projects: [{
    displayName: 'node unit tests',
    testMatch: [
      '<rootDir>/packages/**/*.test.ts',
    ],
    testPathIgnorePatterns: ["integ.*", 'browser.*'],
    testEnvironment: 'node',
    transform: {
      // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
      // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          tsconfig: {
            sourceMap: true,
          },
        },
      ],
    },
  }, {
    displayName: 'browser unit tests',
    testMatch: [
      '<rootDir>/packages/**/*.browser.test.ts',
    ],
    testEnvironment: 'jsdom',
    transform: {
      // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
      // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          tsconfig: {
            sourceMap: true,
          },
        },
      ],
    },
  }, {
    displayName: 'integration tests',
    testMatch: [
      '**/integ**.test.ts',
    ],
    transform: {
      // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
      // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          tsconfig: {
            sourceMap: true,
          },
        },
      ],
    },
    "testEnvironment": "<rootDir>/packages/tools/integration-tests/dist/jest-environment.js",
  }],
}
