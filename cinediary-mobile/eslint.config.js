// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Fronteiras da Clean Architecture do mobile (docs/architecture/Clean-Architecture-v2-Blueprint.md §4.1).
 * Quebrar uma regra vira erro de lint.
 */
const restrict = (groups, message) => ['error', { patterns: [{ group: groups, message }] }];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/features/*/domain/**'],
    rules: {
      'no-restricted-imports': restrict(
        [
          'react',
          'react-native',
          'expo*',
          '@tanstack/*',
          'openapi-fetch',
          '@clerk/*',
          '@/shared/*',
          '**/application/**',
          '**/infrastructure/**',
          '**/presentation/**',
        ],
        'domain/ só tem tipos e funções puras (sem React, HTTP, storage ou outras camadas).',
      ),
    },
  },
  {
    files: ['src/features/*/infrastructure/**'],
    rules: {
      'no-restricted-imports': restrict(
        ['react', 'react-native', '@tanstack/*', '@/shared/ui', '@/shared/ui/*', '**/application/**', '**/presentation/**'],
        'infrastructure/ só fala com HTTP/storage e mapeia DTO → domínio.',
      ),
    },
  },
  {
    files: ['src/features/*/application/**'],
    rules: {
      'no-restricted-imports': restrict(['**/presentation/**', '@/shared/ui', '@/shared/ui/*'], 'application/ não conhece a UI.'),
    },
  },
  {
    files: ['src/features/*/presentation/**'],
    rules: {
      'no-restricted-imports': restrict(
        ['**/infrastructure/**', '@/shared/api/client', 'openapi-fetch'],
        'presentation/ usa os casos de uso de application/, nunca o gateway HTTP direto.',
      ),
    },
  },
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': restrict(['@/features/*', '@/features/**'], 'shared/ não pode depender de features.'),
    },
  },
  {
    // Toque repetido abria a mesma tela várias vezes (#102): abrir e voltar passam pelo `nav`, que ignora o 2º toque.
    files: ['src/**'],
    ignores: ['src/shared/ui/navigation/nav.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='router'][property.name=/^(push|navigate|back)$/]",
          message: 'Use nav.push / nav.navigate / nav.back (@/shared/ui/navigation/nav): eles ignoram o toque repetido.',
        },
      ],
    },
  },
  {
    files: ['src/app/**'],
    rules: {
      'no-restricted-imports': restrict(
        ['@/features/*/domain/**', '@/features/*/application/**', '@/features/*/infrastructure/**', '@/shared/api/**'],
        'src/app só tem rotas finas: importa a Screen de presentation/ e mais nada.',
      ),
    },
  },
]);
