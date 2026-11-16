# cinediary-mobile

App do CineDiary para iOS e Android, em **Expo** (React Native + TypeScript), organizado em
**Feature-Sliced + Clean Architecture**.

> Voltar para o [README principal](../README.md). Lá estão os comandos para rodar tudo junto (`make dev`,
> `make front`…). Antes de rodar, preencha o [`.env.local`](#variáveis-de-ambiente-envlocal).

## Sumário

- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Catálogo do Design System (dentro do app)](#catálogo-do-design-system-dentro-do-app)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Features](#features)
- [Splash e tela de conexão](#splash-e-tela-de-conexão)
- [Analytics e feature flags (PostHog)](#analytics-e-feature-flags-posthog)
- [Regras de dependência](#regras-de-dependência)
- ["Quero mudar X, onde mexo?"](#quero-mudar-x-onde-mexo)
- [Scripts](#scripts)
- [Variáveis de ambiente (.env.local)](#variáveis-de-ambiente-envlocal)
- [Expo Go, development build e EAS](#expo-go-development-build-e-eas)

---

## Tecnologias

| Tecnologia | Versão | Para quê |
| --- | --- | --- |
| Expo SDK | 58 | Base do app (módulos nativos, build, config) |
| React Native | 0.88 | UI nativa |
| React | 19 | Componentes (com **React Compiler**: memoização automática) |
| TypeScript | 6 | Tipagem |
| Expo Router | 58 | Navegação por arquivos em `src/app/` (abas nativas, stacks, modais) |
| TanStack Query | 5 | Dados do servidor: cache, refetch, UI otimista |
| openapi-fetch + openapi-typescript | — | Cliente HTTP **tipado** a partir do `openapi-v1.yaml` |
| Clerk (`@clerk/expo`) | 4 | Login e cadastro (e-mail, senha, username, código por e-mail) |
| PostHog | 4 | Eventos de analytics, erros e **feature flags** (testes A/B) |
| Reanimated + Gesture Handler | 4 / 3 | Animações e gestos (arrastar para excluir, pílula animada…) |
| expo-image | 58 | Imagens com cache (pôsteres, fotos) |
| react-native-view-shot + expo-sharing | — | Gerar e compartilhar a imagem do registro (Stories) |
| AsyncStorage / SecureStore | — | Dados locais no aparelho: buscas recentes / convite pendente, importação em andamento, Story já visto |
| Phosphor | 3 | Ícones |

---

## Como rodar

O jeito mais fácil é pela **raiz** do projeto: `make dev` (tudo) ou `make front` (só o app, com o backend
já rodando). Veja o [README principal](../README.md#rodando-no-dia-a-dia).

Para rodar só o Expo daqui de dentro:

```bash
npm install          # só na primeira vez (o make dev faz isso sozinho)
npx expo start --go  # abre no Expo Go: escaneie o QR code
```

- **`--go`:** o projeto tem o `expo-dev-client` instalado. Sem esse parâmetro, o Expo tenta abrir um
  development build, que ainda não temos (ver [abaixo](#expo-go-development-build-e-eas)).
- **Atalhos no terminal do Expo:** `r` recarrega o app, `j` abre o debugger, `m` abre o menu e `?` mostra
  todos.
- **No celular:** sacuda o aparelho para abrir o menu do Expo (Reload, debugger…).

---

## Fluxo de trabalho

O ciclo de quem mexe no app, do começo ao fim de uma tarefa:

1. **Suba o ambiente.** Na raiz, rode `make back` num terminal (banco, API e o Svix) e `make front` noutro
   (o Expo). Abra o app no celular pelo QR code.
2. **Ache o lugar.** Use ["Quero mudar X, onde mexo?"](#quero-mudar-x-onde-mexo) e a tabela de
   [arquivos principais por feature](#arquivos-principais-por-feature).
3. **Mude e veja na hora.** Ao salvar, o **Fast Refresh** atualiza a tela sozinho, mantendo o estado.
   - Se algo ficar "preso" ou estranho logo depois de mudar o código (por exemplo, um número antigo na tela),
     sacuda o celular e toque em **Reload**. O Fast Refresh às vezes guarda estado velho.
   - Mudou o `.env.local`, o `app.json` ou instalou uma lib? Feche o Expo (`Ctrl+C`) e abra de novo.
4. **Confira componentes e telas especiais** no [catálogo do Design System](#catálogo-do-design-system-dentro-do-app).
5. **Mexeu em analytics ou flags?** Veja o evento chegando e teste as variantes:
   [Analytics e feature flags](#analytics-e-feature-flags-posthog).
6. **Antes de terminar**, rode `npm run typecheck` e `npm run lint`. O lint também barra importações entre
   camadas na direção errada e quebras das regras do React Compiler.
7. **Mexeu no contrato da API?** O backend atualiza o `docs/architecture/openapi-v1.yaml` e, aqui,
   `npm run api:types` regera os tipos. Veja o
   [passo a passo de ponta a ponta](../cinediary-backend/README.md#uma-feature-de-ponta-a-ponta).

**Para depurar:**
- `j` no terminal do Expo abre o debugger, com console, breakpoints e rede.
- Os eventos de analytics aparecem no console como `[analytics] nome_do_evento {…}`.
- Os erros de rede aparecem como `API respondeu 4xx/5xx`.

---

## Catálogo do Design System (dentro do app)

O próprio app tem um catálogo vivo dos componentes e das telas especiais, para ver e testar sem precisar
provocar a situação de verdade. Ele **só existe em desenvolvimento**: não aparece no app publicado.

**Como abrir:** aba **Perfil** → **engrenagem** (Configurações) → **Design System (dev)**, no fim da lista.

| Aba | O que tem |
| --- | --- |
| **Componentes** | Tipografia, cores, botões, chips, nota e curtida, pôsteres, pílulas (`SegmentedControl`), avatares, barras, progresso, estado vazio |
| **Telas** | **Splash**: roda a animação dentro de um quadro ou em tela cheia; "Internet lenta" segura o app por 4 s, para ver a splash esperando com o ícone completo. **Sem conexão**: as duas versões (clara e terracota) e os dois casos (sem internet e servidor fora), com prévia, tela cheia e "Repetir a animação" |

**Onde fica:** `src/shared/ui/dev/DesignSystemScreen.tsx`, com a rota `src/app/_dev/design-system.tsx`.
Fez um componente ou uma tela especial nova? Coloque um exemplo aqui: é o jeito mais rápido de alguém ver e
revisar.

---

## Estrutura de pastas

```text
cinediary-mobile/
├── app.json              # nome, ícone, bundle id, permissões, plugins, projectId do EAS
├── eas.json              # perfis de build do EAS (development, preview, production)
├── eslint.config.js      # lint + regras de camadas (ver "Regras de dependência")
├── .env.example          # modelo do .env.local
├── assets/               # ícone, splash, imagens
└── src/
    ├── app/              # ROTAS (Expo Router): cada arquivo é uma tela
    ├── features/         # o app, dividido por assunto (ver "Features")
    └── shared/           # o que todas as features usam
```

### `src/app/`: as rotas

Cada arquivo aqui é uma rota, com **só 3 a 5 linhas**: ele importa e renderiza uma *Screen* de
`features/*/presentation/screens/`. Os `_layout.tsx` definem a navegação: abas, stacks e quem pode ver o quê
(logado ou não, onboarding feito ou não).

```text
src/app/
├── _layout.tsx                     # providers + navegador raiz (RootNavigator)
├── (auth)/                         # sem login: boas-vindas, entrar, criar conta
├── (onboarding)/                   # primeiro acesso: gêneros, "já vi", favoritos (tudo opcional)
├── (tabs)/                         # as 5 abas: Início, Buscar, Registrar, Juntos, Perfil
├── title/[mediaType]/[tmdbId]      # página do filme/série
├── title-reviews/[titleId]         # todas as reviews do título
├── title-credits/[mediaType]/[tmdbId]  # elenco e equipe completos
├── person/[personId]               # filmografia de uma pessoa
├── company/[companyId]             # títulos de uma produtora
├── quick-log/[mediaType]/[tmdbId]  # registro rápido (folha que sobe)
├── entry/[entryId]/                # um registro seu: ver, editar, compartilhar (Stories)
├── diary                           # seu diário completo
├── u/[username]/                   # perfil de outra pessoa: perfil, diário, seguidores, seguindo, registro
├── friends                         # feed completo "Novidades dos amigos"
├── notifications                   # o sino (Amigos / Para você)
├── follow-requests                 # pedidos para seguir
├── profile/edit, profile/favorites, settings
├── import                          # importação do Letterboxd
├── match/[matchId]/                # Taste Match: sala, Story, adicionar à watchlist de vocês
├── match/invite/[code]             # deep link do convite: cinediary://match/invite/CODE
└── _dev/design-system              # catálogo do Design System (só em desenvolvimento)
```

### `src/features/<feature>/`: as quatro camadas

```text
features/social/
├── domain/          # tipos e regras puras: TypeScript puro, sem React, sem HTTP
│   └── social.ts            # ex.: Person, Relationship, nextRelationship(), dayBucket()
├── infrastructure/  # conversa com a API
│   └── socialApi.ts         # chamadas HTTP + conversão DTO (da API) → tipo do domínio
├── application/     # hooks de caso de uso (TanStack Query)
│   ├── socialQueries.ts     # useToggleFollow, usePeopleSearch… (cache, otimista, invalidação, eventos)
│   └── feedQueries.ts, titleCommunityQueries.ts, entryConversation.ts
└── presentation/    # o que aparece na tela
    ├── screens/             # telas inteiras (as rotas renderizam estas)
    ├── components/          # pedaços das telas (FollowButton, ReviewCard…)
    └── navigation.ts        # funções de navegação (openProfile, openTitleReviews…)
```

### `src/shared/`: o que é de todos

| Pasta | O que tem |
| --- | --- |
| `shared/api/` | `client.ts` (cliente HTTP tipado, que põe o token do Clerk e o idioma em cada chamada), `queryClient.ts` (TanStack Query), `queryKeys.ts` (prefixos de cache compartilhados), `schema.d.ts` (**gerado**, não edite) |
| `shared/config/` | `env.ts`: lê as variáveis `EXPO_PUBLIC_*` e troca `localhost` pelo IP do computador em dev |
| `shared/auth/` | `AuthProvider.tsx`: Clerk + a ponte da sessão para a API e o analytics |
| `shared/analytics/` | `analytics.tsx` (PostHog), `events.ts` (**eventos tipados**: todo evento novo entra aqui), `featureFlags.ts` (flags e testes A/B) |
| `shared/i18n/` | Textos em `pt/*.ts` (fonte) e `en/*.ts` (tradução, com o mesmo formato), `format.ts` (datas e números no idioma do aparelho), `locale.ts` |
| `shared/theme/` | `tokens.ts` (cores, espaçamentos, raios, tipografia do Design System), `fonts.ts` (Fraunces e Nunito) |
| `shared/ui/` | O **Design System**: `Button`, `Text`, `Avatar`, `PosterArt`, `StarRating`, `SegmentedControl`, `ActionSheet`, `Screen`, `Rail`, `Toast`… |
| `shared/ui/navigation/` | `AppTabs` (abas nativas), `TopBar`, `FloatingBackButton`, `useRefetchOnFocus` |
| `shared/storage/` | `useRecents.ts` (buscas recentes, por conta, no aparelho) |
| `shared/sharing/` | `storyShare.ts` (imagem para os Stories) |
| `shared/providers/` | `AppProviders.tsx`: junta os providers (Query, Clerk, PostHog, Toast…) |

---

## Features

| Feature | Telas | O que faz |
| --- | --- | --- |
| `auth` | Welcome, SignIn, SignUp, Onboarding (gêneros, já vi, favoritos), EditProfile, Settings, FavoritesEditor | Entrar e cadastrar (com username disponível na hora), onboarding, editar perfil (foto, bio, pronomes), configurações (perfil privado, spoilers, quem pode responder) |
| `catalog` | Search, TitleDetail, TitleCredits, Person, Company | Busca de filmes e séries (com buscas recentes), página do título (trailer, elenco, extras, similares), filmografia, produtora |
| `diary` | Home, Log, QuickLog, Diary, EditEntry, ShareEntry | Início (continuar assistindo, para você, novidades dos amigos), registrar, registro rápido, diário, editar, imagem para os Stories |
| `social` | PersonProfile, PersonDiary, PersonEntry, Entry, FollowList, FollowRequests, FriendsFeed, Notifications, TitleReviews | Perfis, seguir e pedidos, feed, sino, curtir e responder, reviews do título, nota do público e amigos que assistiram (`TitleCommunitySection`) |
| `match` | TogetherHub, MatchDetail, MatchStory, AcceptInvite, AddToSharedWatchlist | Taste Match: convite, sala de vocês, Story em slides, watchlist compartilhada, recomendações |
| `importing` | Import | Importação do Letterboxd (enviar o ZIP, ver o resumo, confirmar) |
| `stats` | Profile | A aba Perfil: cabeçalho, favoritos, estatísticas, últimos registros |

### Arquivos principais por feature

Os arquivos por onde começar a ler (e a mexer) em cada uma:

| Feature | `application/` (hooks) | `infrastructure/` (API) | Componentes que mais aparecem |
| --- | --- | --- | --- |
| `auth` | `usePasswordAuth` (entrar, cadastrar, sair), `profileQueries` (`useMe`, `useUpdateProfile`), `useOnboarding`, `useEditProfile`, `useUsernameAvailability`, `favoritesMutations`, `useConnectionGate` (tela de conexão na abertura) | `profileApi`, `clerkErrors` (mensagens do Clerk em português) | `navigation/RootNavigator.tsx` (quem vê qual rota, a splash e a tela de conexão), `SessionGate`, `PosterWall` (as boas-vindas) |
| `catalog` | `catalogQueries` (busca, detalhe, elenco, extras, temporadas) | `catalogApi`, `titleMapper` | `TitleHeader`, `TitleActions`, `CastSection`, `TitleExtrasSections`, `SeriesProgressSection`, `CatalogSearchPanel`, `TrailerPlayer` |
| `diary` | `diaryQueries` (diário, `invalidateAfterLog`, `refreshHome`), `titleStateMutations` (assistido, curtir, watchlist, episódios), `useQuickLog`, `useShareEntry`, `useHidesSpoiler` | `diaryApi` | `QuickLogForm`, `EntryDetail`, `EntryStoryCard` (imagem dos Stories), `SpoilerReview`, `ContinueWatching`, `DiaryTimeline` |
| `social` | `socialQueries` (perfil, seguir, busca de pessoas), `feedQueries` (feed, sino, atividade), `entryConversation` (curtidas e respostas), `titleCommunityQueries` (nota do público e reviews) | `socialApi` | `ProfileHeader`, `FollowButton`, `ActivityRow`, `BellButton`, `FriendsRail`, `EntryConversation`, `ReviewCard`, `TitleCommunitySection` |
| `match` | `matchQueries`, `recommendationQueries`, `useStoryPlayer`, `useShareSlide` | `matchApi`, `recommendationsApi`, `pendingInviteStorage`, `storySeenStorage` | `MatchCard`, `CalculatingView`, `story/` (os slides), `SharedWatchlistGrid` |
| `importing` | `useImportFlow` | `importApi`, `activeImportStorage` | `ImportFrame`, `ImportReview` |
| `stats` | `useMyStats` (`refreshProfile`) | `statsApi` | `StatCards` |

**Dicas de cache:** cada hook em `application/` define a sua `queryKey`. Os prefixos que várias features
compartilham estão em `shared/api/queryKeys.ts`, para uma ação invalidar o que precisa: registrar um título,
por exemplo, invalida diário, watchlist, catálogo, estatísticas, Match e página social do título
(`invalidateAfterLog` em `diaryQueries.ts`).

---

## Splash e tela de conexão

### Splash animada
Na abertura (e em cada Reload), o app mostra a splash **nativa** (fundo terracota com o "c", configurada no
`app.json`). Logo em seguida, a **animada** aparece por cima, idêntica, e a estrela entra como uma estrela
cadente até o lugar dela no ícone. A splash só sai quando o app está pronto: login conferido e, se logado,
perfil carregado. Assim nunca pisca a tela de entrar nem um "carregando".

| Arquivo | O que tem |
| --- | --- |
| `src/shared/ui/splash/AnimatedSplash.tsx` | A animação: voo, rastro, impacto, saída, "Reduzir movimento" |
| `src/shared/ui/splash/brandMark.ts` | O desenho do "c" e da estrela, nas mesmas coordenadas do ícone |
| `src/shared/ui/splash/BrandGlyphs.tsx` | O "c" e a estrela como componentes reaproveitáveis (usados na tela de conexão) |
| `src/features/auth/presentation/navigation/RootNavigator.tsx` | Mostra a splash e decide quando o app está pronto (`ready`) |
| `app.json` → plugin `expo-splash-screen` | A splash nativa: `backgroundColor` e `image` (`assets/splash-icon.png`) |

**Ajustes rápidos** (constantes no topo de `AnimatedSplash.tsx`):

| Constante | O que muda |
| --- | --- |
| `FLIGHT_MS` | Duração do voo da estrela (mais alto = mais lenta) |
| `FLIGHT_DELAY` | Pausa antes do voo, com o "c" parado |
| `FROM` | De onde a estrela vem (em dp, a partir do lugar dela no ícone) |
| `BEND` | O quanto a curva do voo abre |
| `TRAIL` e `TRAIL_LAG` | Quantas bolinhas tem o rastro e a distância entre elas |
| `IMPACT_MS` | Duração do brilho do pouso |

> [!WARNING]
> O `SIZE` do `AnimatedSplash.tsx` precisa ser igual ao `imageWidth` do `app.json` (200), e o fundo igual ao
> `backgroundColor` (`#A9553A`). Se forem diferentes, a troca da splash nativa para a animada dá um "pulo".
> Mudou o ícone? Veja [`docs/design/brand/`](../docs/design/brand/README.md).

No Expo Go, a splash nativa do começo é a do próprio Expo Go, então a transição só fica perfeita num build. A
parte animada roda igual.

### Tela de conexão (sem internet / servidor fora)
Se a abertura não conseguir falar com o login ou com a API, a splash sai e entra a tela de conexão: a estrela
se solta do "c", cai no chão e fica balançando.

| Situação | O que aparece |
| --- | --- |
| Celular sem internet | "Você está sem internet", logo depois da animação da splash |
| Internet ok, mas o login ou o perfil não chegaram em 10 s, ou o servidor deu erro 5xx | "O CineDiary não respondeu", com "Sair da conta" se você estiver logado |
| O servidor recusou o perfil (erro 4xx) | A tela simples de antes (`SessionGate`), com "Tentar de novo" e "Sair" |

Quando a internet volta, ela **tenta de novo sozinha**. O "Tentar de novo" dá mais 10 s de espera.

| Quero… | Onde |
| --- | --- |
| **Trocar a versão (clara ↔ terracota)** | `src/shared/ui/ConnectionErrorScreen.tsx` → `APP_CONNECTION_ERROR_VARIANT = 'light'` (ou `'dark'`). Compare as duas no catálogo, aba **Telas** |
| Mudar os textos | `strings.common.connection` em `shared/i18n/pt/common.ts` e `en/common.ts` |
| Mudar o tempo de espera | `STARTUP_TIMEOUT_MS` em `src/features/auth/application/useConnectionGate.ts` |
| Mudar quando a tela aparece | `useConnectionGate.ts`: decide entre sem internet, servidor ou nada |

**Para testar:**
- **Servidor fora:** rode `make stop` (ou pare a API) e abra o app (Reload). Espere uns 10 s. Depois rode
  `make back` e toque em "Tentar de novo".
- **Sem internet:** só dá para testar num build instalado. No Expo Go, com o modo avião, nem o app carrega,
  porque o código vem do seu computador pela rede. Para ver a tela em si, use o catálogo, aba **Telas**.

---

## Analytics e feature flags (PostHog)

O PostHog recebe os **eventos** de uso e controla as **feature flags**, que ligam ou desligam coisas e
rodam testes A/B. Sem as chaves no `.env.local`, tudo continua funcionando: os eventos vão só para o console e
as flags usam o valor padrão.

### Eventos
- **Contrato:** `src/shared/analytics/events.ts`. Cada evento é tipado: o TypeScript reclama se faltar ou
  sobrar uma propriedade.
- **Fonte oficial:** a tabela de eventos em `docs/architecture/ADRs-e-Especificacao-de-Tasks.md` (seção 2).
- **Como disparar:** `analytics.track('nome_do_evento', { … })`, sempre num hook de `application/`, nunca
  direto na tela.
- **Quem é a pessoa:** o app se identifica no PostHog com o id do usuário e o `username` (em
  `shared/auth/AuthProvider.tsx`).
- **Nunca mande** e-mail, nome, texto de review ou código de convite.

**Evento novo, passo a passo:**
1. Adicione o evento e as propriedades em `events.ts`.
2. Registre na tabela do ADR.
3. Chame `analytics.track(...)` no hook.
4. Rode o app: o evento aparece no console do Metro como `[analytics] nome_do_evento {…}`.
5. Confira no PostHog: **Activity** (ou *Live events*), filtrando pelo nome do evento.

### Feature flags

As flags que o app usa ficam registradas em `src/shared/analytics/featureFlags.ts`, com a chave do PostHog, as
variantes e o **`fallback`**: o valor usado quando o PostHog está desligado, ainda carregando, fora do ar ou
a flag não existe.

| Flag (chave no PostHog) | Tipo | Valores | Padrão (`fallback`) | Onde é usada |
| --- | --- | --- | --- | --- |
| `trailer-button-placement` | Multivariada (teste A/B) | `meta` (pílula "▶ Trailer" abaixo dos dados) ou `actions` (botão na fila de ações) | `actions` | Página do título: `catalog/presentation/trailerPlacement.ts` |
| `episode-stills` | Liga/desliga | `true` / `false` | `true` | Lista de episódios: `catalog/presentation/components/SeriesProgressSection.tsx` |

**No código:**
```ts
const placement = useFlagVariant('trailerButtonPlacement'); // 'meta' | 'actions'
const withStills = useFlagEnabled('episodeStills');         // boolean
```
Pedir a variante já registra no PostHog que a pessoa viu o teste (o evento `$feature_flag_called`), que o
experimento usa para separar os grupos.

**Criar uma flag nova:**
1. Registre a flag em `featureFlags.ts`:
   - teste A/B em `FEATURE_FLAGS`, com a chave, as `variants` e o `fallback`;
   - liga/desliga em `BOOLEAN_FLAGS`, com a chave e o `fallback`.
2. Use `useFlagVariant('nome')` ou `useFlagEnabled('nome')` onde precisar.
3. No PostHog, vá em **Feature flags → New feature flag**:
   - **Key:** exatamente a mesma chave do código (ex.: `trailer-button-placement`);
   - **Tipo:**
     - liga/desliga: *Release toggle (boolean)*;
     - teste A/B: *Multiple variants*, criando as variantes com as **mesmas chaves** do código (ex.: `meta`
       e `actions`) e a porcentagem de cada uma;
   - **Release conditions:** quem recebe. Para todo mundo, 100% dos usuários;
   - salve e deixe a flag **ativa**.
4. Para medir o teste A/B, crie um experimento em **Experiments → New experiment**, ligado à flag, com a
   métrica de sucesso: para o trailer, o evento `trailer_opened`, que já leva a variante em `placement`.

**Testar uma variante no seu celular (sem afetar os outros):**
1. Na flag, adicione uma **condição** no topo das *Release conditions*: a propriedade de pessoa `username`
   igual ao seu @.
2. Nessa condição, use **Optional override** (forçar variante) e escolha a variante que quer ver.
3. No celular, faça um **Reload**: as flags são carregadas quando o app abre.
4. Depois do teste, apague a condição.

Para ver as duas variantes sem tocar no PostHog, mude o `fallback` em `featureFlags.ts` com as chaves do
PostHog vazias no `.env.local`. O app aí usa só os valores padrão.

> Os nomes dos menus do PostHog mudam de vez em quando. Se não achar, procure pelo nome da opção na busca do
> painel.

---

## Regras de dependência

O `npm run lint` **barra** importações na direção errada:

- `domain/` não importa React, Expo, HTTP, `shared/` nem outras camadas.
- `infrastructure/` não importa `application/`, `presentation/` nem UI.
- `application/` não importa `presentation/` nem UI.
- `presentation/` nunca chama `infrastructure/` nem o cliente HTTP direto: sempre passa por um hook de
  `application/`.
- `shared/` nunca importa `features/`.
- `src/app/` só importa Screens de `presentation/`.

Além dessas, o **React Compiler** tem regras próprias, que o lint também confere. Duas que mais aparecem:
- **Não ler `ref.current` durante o render.** Leia em efeitos e handlers.
- **Não chamar `setState` dentro de um `useEffect` só para "sincronizar" estado.** Calcule o valor no render.

---

## "Quero mudar X, onde mexo?"

| Quero… | Onde |
| --- | --- |
| Uma tela nova | A Screen em `features/<feature>/presentation/screens/` + um arquivo de rota em `src/app/` que a renderiza. Se ela não ficar dentro das abas, registre no `RootNavigator` (`features/auth/presentation/navigation/RootNavigator.tsx`) |
| Mudar um texto | `shared/i18n/pt/<área>.ts` **e** `shared/i18n/en/<área>.ts` (o TypeScript reclama se faltar no inglês) |
| Mudar uma cor ou espaçamento | `shared/theme/tokens.ts` (nunca escreva cor solta no componente) |
| Um componente reutilizável | `shared/ui/` (e exporte em `shared/ui/index.ts`). Se for de uma feature só, `features/<feature>/presentation/components/` |
| Chamar uma rota nova da API | 1. Atualize o [`openapi-v1.yaml`](../docs/architecture/openapi-v1.yaml). 2. `npm run api:types`. 3. A chamada em `features/<feature>/infrastructure/*Api.ts`. 4. Um hook em `application/`. 5. Use o hook na tela |
| Mudar o que é guardado em cache ou o que atualiza depois de uma ação | O hook em `application/` (`queryKey`, `onMutate`, `invalidateQueries`). Prefixos compartilhados em `shared/api/queryKeys.ts` |
| Um evento de analytics novo | `shared/analytics/events.ts` (tipado) → `analytics.track(...)` no hook. Registre também na tabela de eventos do ADR (`docs/architecture/ADRs-e-Especificacao-de-Tasks.md`). Nunca mande e-mail, nome, texto de review ou código de convite |
| Uma feature flag / teste A/B | `shared/analytics/featureFlags.ts` + crie a flag no PostHog com a mesma chave → `useFlagVariant` / `useFlagEnabled` ([passo a passo](#feature-flags)) |
| A versão da tela de sem conexão (clara ↔ terracota) | `APP_CONNECTION_ERROR_VARIANT` em `shared/ui/ConnectionErrorScreen.tsx` |
| A animação da splash (velocidade, trajetória, rastro) | As constantes no topo de `shared/ui/splash/AnimatedSplash.tsx` ([tabela](#splash-animada)) |
| Quando o app é considerado "pronto" (sai a splash) e as rotas por login/onboarding | `features/auth/presentation/navigation/RootNavigator.tsx` |
| Mostrar um componente ou uma tela no catálogo | `shared/ui/dev/DesignSystemScreen.tsx` |
| Uma permissão nativa ou um plugin | `app.json` (nunca edite `ios/` ou `android/`: são gerados) |
| Uma lib nova | `npx expo install <lib>` (nunca `npm install` direto: o Expo escolhe a versão compatível). Se ela tiver código nativo que o Expo Go não tem, vai precisar de development build |

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | `expo start` (prefira `npx expo start --go` ou o `make front` da raiz) |
| `npm run typecheck` | Checa os tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint + regras de camadas + regras do React Compiler |
| `npm run api:types` | Regera `src/shared/api/schema.d.ts` a partir do `../docs/architecture/openapi-v1.yaml` |
| `npm run doctor` | `expo-doctor`: confere versões e configuração |

Antes de dar uma tarefa por terminada, rode **`npm run typecheck` e `npm run lint`**.

---

## Variáveis de ambiente (`.env.local`)

```bash
cp .env.example .env.local        # Windows sem WSL: copy .env.example .env.local
```

O `.env.local` **não vai para o git**. Atenção: as variáveis `EXPO_PUBLIC_*` vão **dentro do app**, e qualquer
pessoa com o app consegue lê-las. Por isso aqui só entram chaves **públicas**, nunca segredos (como o secret
key do Clerk ou o token do TMDB, que ficam no backend).

### Resumo

| Variável | Obrigatória? | De onde vem |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Não (padrão `http://localhost:8080`) | Deixe `http://localhost:8080` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk → API keys → Publishable key |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | Não (sem ela: analytics e flags desligados) | PostHog → Settings → Project token & ID → Project token |
| `EXPO_PUBLIC_POSTHOG_HOST` | Junto com a chave | PostHog → a região do projeto (US ou EU) |

> [!TIP]
> O Clerk e o PostHog já estão configurados e são os mesmos para todo mundo em desenvolvimento: você só copia
> as chaves dos painéis (peça o convite para entrar neles).

### 1. `EXPO_PUBLIC_API_URL`: deixe `localhost`

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

No celular, `localhost` seria o próprio celular. Por isso, em desenvolvimento, o `src/shared/config/env.ts`
troca `localhost` pelo **IP do computador que roda o Metro**, que é o mesmo que o celular usou para baixar o
app. Funciona em qualquer rede, sem editar nada. No emulador Android, ele usa `10.0.2.2`.

- **Não coloque um IP fixo** (tipo `http://192.168.0.10:8080`): isso desliga a troca automática e quebra
  quando o IP muda.
- **Só mude** para apontar para um servidor de verdade (ex.: `https://api.cinediary.app`).

### 2. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

O Clerk **já está configurado** e o time todo usa o mesmo painel: você só copia a chave. Para entrar no painel,
peça a quem administra para te convidar na aplicação **CineDiary**.

1. Entre em [dashboard.clerk.com](https://dashboard.clerk.com) e abra a aplicação **CineDiary**, a mesma do
   `CLERK_ISSUER` do backend.
2. Vá em **Configure → API keys**.
3. Copie a **Publishable key**: começa com `pk_test_` em desenvolvimento ou `pk_live_` em produção.
4. Cole no `.env.local`:
   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

<details open>
<summary>Prints: <code>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</code></summary>

   **1.** Abra a aba Configure  
   <img src="../docs/images/setup/front/clerk_api_keys/passo%201.png" width="520" alt="Abra a aba Configure">

   **2.** No menu, API keys  
   <img src="../docs/images/setup/front/clerk_api_keys/passo%202.png" width="640" alt="No menu, API keys">

   **3.** Escolha Expo e copie a Publishable key (pk_test_…)  
   <img src="../docs/images/setup/front/clerk_api_keys/passo%203.png" width="640" alt="Escolha Expo e copie a Publishable key (pk_test_…)">

</details>

- **Sem essa chave**, o app abre uma tela avisando que falta configuração.
- **Não confunda com a Secret key** (`sk_…`): ela é secreta e **não** vai no app.
- **Configurações do login** (e-mail com código, username, senha, campos do token, webhook): já estão feitas
  no painel. Se um dia precisarem de uma aplicação nova, o passo a passo está no
  [README do backend](../cinediary-backend/README.md#1-clerk-clerk_issuer-e-clerk_webhook_secret).

### 3. `EXPO_PUBLIC_POSTHOG_API_KEY` e `EXPO_PUBLIC_POSTHOG_HOST`

O PostHog recebe os eventos de uso, os erros e os logs, e controla as **feature flags** (ex.: o teste A/B da
posição do botão do trailer). Sem ele, o app funciona normalmente: os eventos vão só para o console e as flags
usam o valor padrão de `featureFlags.ts`.

1. Entre em [posthog.com](https://posthog.com) e abra o projeto do CineDiary. Para criar um, faça a conta e
   escolha a região **US** ou **EU**.
2. Clique na **engrenagem** (*Settings*, canto de baixo, à esquerda) e busque **"project token"** → **Project token & ID**.
3. Copie o **Project token**: começa com `phc_`. Ele é público por natureza (o painel diz *"Safe to use in public apps"*) e pode ir no app.
4. O **host** depende da **Region** que aparece na mesma página (o nosso é *US Cloud*):
   - US: `https://us.i.posthog.com`
   - EU: `https://eu.i.posthog.com`
5. Cole no `.env.local`:
   ```env
   EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

<details open>
<summary>Print: <code>EXPO_PUBLIC_POSTHOG_API_KEY</code></summary>

   **1.** Settings (engrenagem) → busque "project token" → Project token & ID → copie o Project token  
   <img src="../docs/images/setup/front/posthog_project_key/Screenshot%202026-11-16%20at%2018.47.19.png" width="640" alt="Settings (engrenagem) → busque "project token" → Project token & ID → copie o Project token">

</details>

As flags que existem hoje e como criar e testar uma estão em
[Analytics e feature flags](#analytics-e-feature-flags-posthog).

### Depois de mudar o `.env.local`

O Metro só lê as variáveis quando abre. Feche o Expo (`Ctrl+C`) e abra de novo com `make front`, ou
`npx expo start --go -c` (o `-c` limpa o cache).

---

## Expo Go, development build e EAS

- **Expo Go** (o que usamos hoje): o app da loja que roda o seu código na hora. Ele só tem as bibliotecas
  nativas que já vêm dentro dele.
- **Development build:** um "Expo Go do CineDiary", com todas as libs nativas do projeto. Ele é necessário para,
  por exemplo, o Story direto no Instagram e as notificações push. Quem gera é o **EAS** (o serviço de build na
  nuvem do Expo), pelos perfis do [`eas.json`](eas.json).

| Perfil | Para quê |
| --- | --- |
| `development` | Development build num celular de verdade |
| `development-simulator` | Development build no simulador do iOS |
| `preview` | Versão para alguém testar, sem passar pela loja |
| `production` | TestFlight e lojas |

> [!WARNING]
> Ainda **não** rode `make build-dev` para iPhone: ele precisa da assinatura paga do Apple Developer Program,
> que o projeto ainda não tem. Detalhes no [README principal](../README.md#build-do-app-eas-ainda-não).

**Primeira vez:** instale o EAS CLI e entre na sua conta Expo, que precisa ser membro da organização
`cinediary`:

```bash
npm install --global eas-cli
eas login
```

O projeto já está ligado ao expo.dev (`app.json` → `extra.eas.projectId`, `owner: cinediary`). **Não** rode
`eas init` de novo.
