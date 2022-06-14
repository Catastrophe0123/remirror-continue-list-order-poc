module.exports = {
	// setupFilesAfterEnv: ['jest-remirror/environment'],
	setupFilesAfterEnv: ['./jest.framework.dom.ts'],
	testEnvironment: 'jest-environment-jsdom', // Required for dom manipulation
	// transform: {
	// 	'^.+\\.(ts|tsx)?$': 'ts-jest',
	// 	'^.+\\.(js|jsx)$': 'babel-jest',
	// },
	// preset: 'ts-jest',
	// testURL: 'http://localhost:3000/',
	// testEnvironmentOptions: {
	// 	url: 'http://localhost/',
	// },
};
