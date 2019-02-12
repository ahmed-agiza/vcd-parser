module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
		mocha: true
	},
	extends: 'plugin:prettier/recommended',
	parserOptions: {
		ecmaVersion: 2016
	},
	plugins: ['prettier'],
	rules: {
		'prettier/prettier': 'error',
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
		'no-unused-vars': ['warn']
	}
};
