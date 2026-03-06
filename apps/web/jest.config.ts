export default {
  displayName: 'web',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@oneohm-epc/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@oneohm-epc/shared-types/(.*)$': '<rootDir>/../../libs/shared-types/src/$1',
  },
  testRegex: '.*\\.test\\.tsx?$',
  coverageDirectory: '../../coverage/apps/web',
  passWithNoTests: true,
};
