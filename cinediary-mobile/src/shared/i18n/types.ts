/**
 * O formato de um dicionário a partir do PT-BR, mas com os textos "abertos": `'Início'` vira `string`,
 * a tupla `['Comparando ', 'notas', …]` vira uma tupla de strings do MESMO tamanho, e as funções
 * mantêm os parâmetros. Assim o inglês precisa ter exatamente as mesmas chaves (falta uma → erro no
 * tsc), sem precisar repetir as mesmas palavras do português.
 */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly unknown[]
          ? { readonly [K in keyof T]: Widen<T[K]> }
          : T extends object
            ? { [K in keyof T]: Widen<T[K]> }
            : T;
