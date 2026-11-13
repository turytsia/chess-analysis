import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: ['dist', 'public', 'node_modules'],
  },
  {
    settings: {
      react: {
        pragma: 'React',
        version: 'detect',
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: 'tsconfig.json',
        },
      },
    },
    plugins: {
      react: reactPlugin,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...getDefaultRules(),
      ...getChangedRules(),
      ...getNewRules(),
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['i18next', '../**/i18n', '**/translations/*'],
              message:
                'Do not import i18n or translation utilities into test modules. ' +
                'Tests should rely on the real i18n implementation.',
            },
          ],
        },
      ],
    },
  }
);

function getDefaultRules() {
  return {
    'no-eval': 'error',
    indent: 'off',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    'react/self-closing-comp': ['error', { component: true, html: true }],
    'react/jsx-curly-brace-presence': [
      'warn',
      { props: 'never', children: 'never' },
    ],
    'react/jsx-key': ['error', { checkFragmentShorthand: true }],
    'react/prop-types': 'off',
    'react/no-danger': 'error',
    'react/display-name': 'off',
    'react/jsx-uses-react': 'error',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'import/no-relative-packages': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [{ group: ['**/dist'] }],
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.{test,stories}.*',
          '**/test*/**/*',
          '**/test*.*',
          '**/setupTests.*',
        ],
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "MemberExpression[object.name='React'][property.name='createElement']",
        message:
          'Using React.createElement is prohibited due to security concerns. Use JSX instead.',
      },
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'JSX',
        message: 'Please use React.JSX instead.',
      },
    ],
    'unused-imports/no-unused-imports': 'error',
    'react/jsx-no-useless-fragment': [
      'error',
      {
        allowExpressions: true,
      },
    ],
  };
}

function getChangedRules() {
  return {
    '@typescript-eslint/no-restricted-types': [
      'error',
      {
        types: {
          'React.VFC': {
            message: 'Please use React.FC instead.',
            fixWith: 'React.FC',
          },
          VFC: {
            message: 'Please use React.FC instead.',
            fixWith: 'React.FC',
          },
        },
      },
    ],
  };
}

function getNewRules() {
  return {
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTaggedTemplates: true,
      },
    ],
    'no-useless-escape': 0,
    'no-prototype-builtins': 0,
    'no-control-regex': 0,
  };
}
