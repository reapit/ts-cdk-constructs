
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  silent: true, // uncomment this to get console.log
  preset: 'ts-jest',
  testMatch: [
    '<rootDir>/packages/**/*.test.ts',
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
  testEnvironment: 'node',
}
