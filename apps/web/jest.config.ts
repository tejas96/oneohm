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
    '^@oneohm-epc/shared/types$': '<rootDir>/../../libs/shared/src/types/index.ts',
    '^@oneohm-epc/shared/types/(.*)$': '<rootDir>/../../libs/shared/src/types/$1',
    '^@oneohm-epc/shared/utils$': '<rootDir>/../../libs/shared/src/utils/index.ts',
    '^@oneohm-epc/shared/schemas$': '<rootDir>/../../libs/shared/src/schemas/index.ts',
    '^@oneohm-epc/shared/constants$': '<rootDir>/../../libs/shared/src/constants/index.ts',
    '^@oneohm-epc/shared$': '<rootDir>/../../libs/shared/src/index.ts',
  },
  testRegex: '.*\\.test\\.tsx?$',
  coverageDirectory: '../../coverage/apps/web',
  passWithNoTests: true,
};
