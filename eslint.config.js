'use strict';

const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  { ignores: ['coverage/', 'node_modules/'] },

  // The directive ships as a plain script to browsers running AngularJS 1.x,
  // so it is held to ES5: no arrow functions, no let/const, no template
  // literals. Anything newer would break the browsers AngularJS supports.
  {
    files: ['app/**/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: { ...globals.browser, angular: 'readonly' }
    },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: 'error',
      'no-var': 'off',
      strict: ['error', 'function']
    }
  },

  // Specs run in the same browsers, plus Jasmine and angular-mocks globals.
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        angular: 'readonly',
        module: 'readonly',
        inject: 'readonly'
      }
    },
    rules: { ...js.configs.recommended.rules, eqeqeq: 'error' }
  },

  // Config files run in Node, not the browser.
  {
    files: ['*.config.js', 'karma.conf.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: { ...js.configs.recommended.rules, eqeqeq: 'error' }
  }
];
