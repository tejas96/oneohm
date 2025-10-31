/* eslint-disable */
export default {
  displayName: 'mobile',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/react-native/plugins/jest/svg-mock',
    '^react-native$': 'react-native-web',
  },
  transform: {
    '^.+.(js|ts|tsx)$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js',
    ),
  },
  coverageDirectory: '../../coverage/apps/mobile',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
  ],
};
