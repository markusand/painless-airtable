
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: { '^.+\\.ts?$': 'ts-jest' },
	transformIgnorePatterns: ['node_modules'],
};

export default config;
