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
    '^@tejas96/shared/types$': '<rootDir>/../../libs/shared/src/types/index.ts',
    '^@tejas96/shared/types/(.*)$': '<rootDir>/../../libs/shared/src/types/$1',
    '^@tejas96/shared/utils$': '<rootDir>/../../libs/shared/src/utils/index.ts',
    '^@tejas96/shared/schemas$': '<rootDir>/../../libs/shared/src/schemas/index.ts',
    '^@tejas96/shared/constants$': '<rootDir>/../../libs/shared/src/constants/index.ts',
    '^@tejas96/shared$': '<rootDir>/../../libs/shared/src/index.ts',
  },
  testRegex: '.*\\.test\\.tsx?$',
  coverageDirectory: '../../coverage/apps/web',
  passWithNoTests: true,
};
