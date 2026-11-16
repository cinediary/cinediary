# CineDiary: o que falta fazer

Mapa para virar cards no GitHub Projects. Cada `###` é um card: o título já está pronto para colar e o texto abaixo
dele vai na descrição. Os caminhos de arquivo são relativos à raiz do repositório.

**Legenda:**
- **Área:** `backend`, `app`, `infra`, `design`, `produto` (um card pode ter mais de uma).
- **Tamanho:** **P** (até 1 dia), **M** (alguns dias), **G** (1 a 2 semanas), **GG** (épico: quebrar em cards antes de começar).
- **Depende de:** o card que precisa vir antes.

Colunas sugeridas no Project: *Backlog → Próximos → Fazendo → Revisão → Pronto*. Campo extra sugerido: **Bloco**
(Dev, Pendências, Development build, Features, Lançamento, Futuro).

---

## DoD geral (vale para todo card)

Além da DoD de cada card, um card só vai para **Pronto** quando:

- [ ] **Backend:** a feature tem teste de integração em `cinediary-backend/src/test/java/com/cinediary/api/modules/<módulo>/`,
      cobrindo o caminho feliz e as regras (permissão, perfil privado, dados inválidos), e `make test` passa.
- [ ] **Arquitetura:** o `ArchitectureFitnessTest` passa (nenhum módulo importa `domain`/`application` de outro; só o `api/`).
- [ ] **Banco:** mudanças de estrutura numa migração **nova** (`V<próximo>__descricao.sql`), nunca editando uma que já rodou.
- [ ] **Contrato:** rota nova ou alterada descrita em `docs/architecture/openapi-v1.yaml` e `npm run api:types` rodado no app.
- [ ] **App:** `npm run typecheck` e `npm run lint` sem erros (inclui as regras de camadas e do React Compiler).
- [ ] **Textos:** em português **e** inglês (`cinediary-mobile/src/shared/i18n/pt/*.ts` e `en/*.ts`).
- [ ] **Analytics:** eventos novos em `cinediary-mobile/src/shared/analytics/events.ts` e na tabela do
      `docs/architecture/ADRs-e-Especificacao-de-Tasks.md`. Sem e-mail, nome, texto de review ou código de convite.
- [ ] **Visual:** telas e componentes novos têm exemplo no catálogo do Design System
      (`cinediary-mobile/src/shared/ui/dev/DesignSystemScreen.tsx`), quando fizer sentido.
- [ ] **Docs:** READMEs atualizados se o card muda como rodar, configurar ou onde mexer.
- [ ] **PR:** revisado por outra pessoa e com o CI verde (quando o card 1 estiver pronto).

---

## Bloco 1: Dev (fazer já)

### 1. CI no GitHub Actions
`infra` · **M** · Depende de: 2

**Contexto.** Hoje nada roda os testes automaticamente: só quem lembra de rodar `make test`, `npm run typecheck` e
`npm run lint` antes de subir. O CI roda tudo a cada push ou pull request e mostra no PR se algo quebrou.

**O que fazer.** Criar um workflow por parte, cada um disparando só quando os arquivos dela mudam:

| Arquivo (novo) | O que roda |
| --- | --- |
| `.github/workflows/backend.yml` | Java 25 + `./gradlew test` em `cinediary-backend/` (testes de integração com PostgreSQL e Neo4j pelo Testcontainers; o runner `ubuntu-latest` já tem Docker) |
| `.github/workflows/mobile.yml` | Node 22 + `npm ci`, `npm run typecheck` e `npm run lint` em `cinediary-mobile/` |
| `.github/workflows/contract.yml` | Regera os tipos (`npm run api:types`) e falha se `cinediary-mobile/src/shared/api/schema.d.ts` mudar (alguém esqueceu de regerar) |

**Exemplo** (`backend.yml`):
```yaml
name: Backend
on:
  pull_request:
    paths: ['cinediary-backend/**', 'docs/architecture/openapi-v1.yaml']
  push:
    branches: [main]
    paths: ['cinediary-backend/**']
jobs:
  test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: cinediary-backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '25' }
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew test
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: test-report, path: cinediary-backend/build/reports/tests/test }
```

**Exemplo** (o passo do contrato, em `contract.yml`):
```yaml
      - run: npm ci
        working-directory: cinediary-mobile
      - run: npm run api:types
        working-directory: cinediary-mobile
      - run: git diff --exit-code cinediary-mobile/src/shared/api/schema.d.ts
```

**DoD:**
- [ ] Os três workflows existem e rodam nos PRs.
- [ ] Um PR com um teste quebrado fica vermelho; consertando, fica verde.
- [ ] Um PR que mexe só no app não roda o workflow do backend (e vice-versa).
- [ ] Quando o backend falha, o relatório de testes fica disponível para baixar no Actions.
- [ ] Os três checks são obrigatórios na proteção da `main` (card 2).
- [ ] O README da raiz explica o CI em uma seção curta.

**Como testar:** abra um PR quebrando de propósito um teste do backend, um tipo no app e esquecendo de regerar o
`schema.d.ts` depois de mudar o `openapi-v1.yaml`; os três checks devem falhar pelo motivo certo.

---

### 2. Repositório no GitHub e proteção da `main`
`infra` · **P** · Depende de: nada · Bloqueia: 1

**Contexto.** O repositório ainda não tem commits nem remoto. Os `.gitignore` (raiz, `cinediary-backend/`,
`cinediary-mobile/`) já deixam de fora `.env`, `.env.local`, `node_modules`, builds, `.DS_Store` e chaves de build.

**O que fazer:**
1. Criar o repositório no GitHub (privado) e o Project.
2. Primeiro commit a partir da pasta `cinediary/`. Antes, conferir com `git add -n .` que **nenhum** `.env` ou chave entra
   (só os `.env.example`).
3. `git remote add origin …` e `git push -u origin main`.
4. Em *Settings → Branches*, proteger a `main`: só por PR, com uma aprovação e, depois do card 1, com os checks do CI verdes.
5. Convidar o time.

**DoD:**
- [ ] O código está no GitHub; `git log` mostra o primeiro commit.
- [ ] `git ls-files | grep -E '\.env$|\.env\.local$'` não retorna nada.
- [ ] Push direto na `main` é recusado.
- [ ] O Project existe com as colunas e o campo "Bloco".

---

### 3. Testes do backend em qualquer Docker (Docker Desktop, OrbStack, Colima)
`infra` · `backend` · **P**

**Contexto.** Os testes sobem PostgreSQL e Neo4j pelo Testcontainers, que procura o Docker em
`/var/run/docker.sock`. Com o **OrbStack** (ou Colima) esse arquivo pode não existir, e todos os testes falham com
`Could not find a valid Docker environment`. Hoje, o jeito é rodar assim:

```bash
DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock \
TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test
```

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-backend/Makefile` (alvo `test`) | Detectar o socket: se `DOCKER_HOST` estiver vazio, usar o endpoint do contexto ativo (`docker context inspect --format '{{.Endpoints.docker.Host}}'`) |
| `cinediary-backend/README.md` (seção Testes) | Explicar o problema e a solução para OrbStack e Colima |

**Exemplo** (`Makefile`):
```make
test: ## Testes (precisa do Docker aberto)
	DOCKER_HOST=$${DOCKER_HOST:-$$(docker context inspect --format '{{.Endpoints.docker.Host}}')} \
	TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock ./gradlew test
```

**DoD:**
- [ ] `make test` passa com Docker Desktop e com OrbStack, sem variáveis manuais.
- [ ] O README do backend documenta o caso.
- [ ] O CI (card 1) continua funcionando.

---

## Bloco 2: Pendências pequenas do que já existe

### 4. "Já viu o Story" salvo na conta
`backend` · `app` · **P**

**Contexto.** No Taste Match, quem convidou vê a animação "Calculando…" só na **primeira** vez que abre o Story do
Match. Hoje essa marca fica no aparelho (SecureStore), então trocar de celular ou reinstalar mostra a animação de novo.

**Como está hoje:**
- `cinediary-mobile/src/features/match/infrastructure/storySeenStorage.ts`: grava e lê a marca no SecureStore.
- `cinediary-mobile/src/features/match/application/matchQueries.ts`: `useStorySeen`, `markStorySeen` e `hasSeenStory`
  usam esse storage.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-backend/src/main/resources/db/migration/V<próx>__match_story_views.sql` (novo) | Tabela `match_story_views (match_id, user_id, seen_at)`, PK `(match_id, user_id)` |
| `.../modules/match/domain/MatchRepositoryPort.java` | `boolean storySeen(UUID matchId, UUID userId)` e `void markStorySeen(UUID matchId, UUID userId)` |
| `.../modules/match/infrastructure/persistence/MatchRepositoryAdapter.java` | Implementar (insert com `ON CONFLICT DO NOTHING`) |
| `.../modules/match/application/GetMatchStoryUseCase.java` | Devolver `seenByMe` junto com o Story |
| `.../modules/match/presentation/TasteMatchController.java` | `PUT /api/v1/matches/{matchId}/story/seen` (204); só participantes do Match |
| `.../modules/match/presentation/dto/MatchStoryResponse.java` | Campo `seenByMe` |
| `docs/architecture/openapi-v1.yaml` | Rota e campo |
| `cinediary-mobile/src/features/match/infrastructure/matchApi.ts` | `markStorySeen(matchId)` |
| `cinediary-mobile/src/features/match/application/matchQueries.ts` | `useStorySeen` lê `seenByMe` do Story e `markSeen` chama a API (otimista). O SecureStore pode ficar como cache local |

**Exemplo** (migração):
```sql
CREATE TABLE IF NOT EXISTS match_story_views (
    match_id UUID NOT NULL REFERENCES taste_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);
```
(A tabela dos Matches é a `taste_matches`, criada na `V1`.)

**DoD:**
- [ ] Abrir o Story marca como visto na conta; abrir em outro aparelho não mostra o "Calculando…" de novo.
- [ ] Quem não participa do Match recebe 403 ao marcar.
- [ ] Teste de integração: marcar, ler `seenByMe`, idempotência (marcar duas vezes) e o 403.

**Como testar:** abra o Story num celular; faça logout/login (ou use outro aparelho) e abra de novo: sem "Calculando…".

---

### 5. Onde assistir (streamings do título)
`backend` · `app` · **M**

**Contexto.** Mostrar na página do título em quais streamings ele está, no país do aparelho. O TMDB fornece em
`watch/providers`, e o crédito ao JustWatch é obrigatório.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `.../modules/catalog/infrastructure/tmdb/TmdbHttpClient.java` (`extras`) | Somar `watch/providers` no `append_to_response` e ler `watch/providers.results.<PAÍS>.flatrate` (assinatura); opcional: `rent` e `buy` |
| `.../modules/catalog/domain/TmdbExtras.java` | `List<Provider> providers` (`id`, `name`, `logoPath`) e `String providersLink` |
| `.../modules/catalog/application/TitleExtras.java` e `GetTitleExtrasUseCase.java` | Repassar e montar a URL do logo |
| `.../modules/catalog/presentation/dto/TitleExtrasResponse.java` | Campos `watchProviders` e `watchProvidersLink` |
| `docs/architecture/openapi-v1.yaml` | Os campos no schema dos extras |
| `cinediary-mobile/src/features/catalog/domain/extras.ts` | `watchProviders: { id: number; name: string; logoUrl: string \| null }[]` |
| `cinediary-mobile/src/features/catalog/infrastructure/catalogApi.ts` | Mapear |
| `cinediary-mobile/src/features/catalog/presentation/components/TitleExtrasSections.tsx` | Seção "Onde assistir" (logos redondos em fileira) com "Dados: JustWatch" |
| `cinediary-backend/src/test/java/com/cinediary/api/FakeTmdb.java` | Incluir `watch/providers` na resposta do `/movie/603` |

**Exemplo** (leitura no `TmdbHttpClient`):
```java
JsonNode country = body.path("watch/providers").path("results").path(region); // ex.: "BR"
List<TmdbExtras.Provider> providers = new ArrayList<>();
for (JsonNode p : country.path("flatrate")) {
    providers.add(new TmdbExtras.Provider(p.path("provider_id").asLong(), text(p, "provider_name"), text(p, "logo_path")));
}
String link = text(country, "link");
```

**DoD:**
- [ ] A página mostra os logos dos streamings do país do aparelho, com o crédito ao JustWatch.
- [ ] Sem dados para o país, a seção não aparece (nada de espaço vazio).
- [ ] Teste de integração com o `FakeTmdb`: com e sem provedores.
- [ ] Evento opcional `watch_provider_viewed` registrado (sem dados pessoais).

---

### 6. Ícone do iOS no Icon Composer
`design` · `app` · **P**

> **Andamento:** o `app.icon` já foi feito e ligado no `app.json`. Falta só conferir num build (card 9).

**Contexto.** O iOS 26 usa ícones em camadas (claro, escuro, tingido). As camadas estão em `docs/design/brand/icone/`
(`camada-1-fundo`, `camada-2-letra-c`, `camada-3-estrela`).

**O que fazer:**
1. Montar no **Icon Composer** (app da Apple) com as três camadas e exportar o `.icon`.
2. Salvar em `cinediary-mobile/assets/app.icon`.
3. Em `cinediary-mobile/app.json`, dentro de `expo.ios`:
   ```json
   "icon": "./assets/app.icon"
   ```
   O `expo.icon` (`assets/icon.png`) continua valendo para o Android e versões antigas do iOS.

**DoD:**
- [ ] Num build de iOS (card 9), o ícone aparece certo no modo claro, escuro e tingido.
- [ ] O `.icon` também é guardado em `docs/design/brand/icone/`.

---

### 7. Aviso de "sem internet" durante o uso
`app` · **P**

**Contexto.** Na **abertura**, sem internet, já existe a tela de conexão (`useConnectionGate`). **Durante o uso**, cada
tela mostra o próprio erro. A ideia: uma faixa discreta no topo ("Sem internet"), que some sozinha quando a conexão
volta, enquanto as telas continuam mostrando o que já tinham carregado. O `expo-network` já está instalado.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-mobile/src/shared/api/queryClient.ts` | Ligar o `onlineManager` do TanStack ao `expo-network`: sem internet, as consultas pausam em vez de falhar, e voltam sozinhas |
| `cinediary-mobile/src/shared/ui/navigation/OfflineBanner.tsx` (novo) | Faixa no topo (respeitando a área segura), entra e sai com animação |
| `cinediary-mobile/src/features/auth/presentation/navigation/RootNavigator.tsx` | Renderizar a faixa por cima do app (só depois da splash e quando não há tela de conexão) |
| `cinediary-mobile/src/shared/i18n/pt/common.ts` e `en/common.ts` | `offlineBanner: 'Sem internet'` |
| `cinediary-mobile/src/shared/ui/dev/DesignSystemScreen.tsx` | Exemplo na aba "Telas" |

**Exemplo** (`queryClient.ts`):
```ts
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
  return () => sub.remove();
});
```

**DoD:**
- [ ] Modo avião com o app aberto (num build: no Expo Go o app depende da rede): a faixa aparece e as telas mantêm o conteúdo.
- [ ] Ao desligar o modo avião, a faixa some e as telas atualizam sozinhas.
- [ ] A faixa não aparece junto com a tela de conexão da abertura.

---

## Bloco 3: Development build (precisa da conta da Apple)

### 8. Assinatura do Apple Developer Program
`produto` · **P** · Bloqueia: 9, 10, 11, 24, 26

**Contexto.** Sem ela não dá para instalar o app no iPhone (development build), usar TestFlight nem publicar. Uma
conta serve para o time: o EAS guarda os certificados na organização `cinediary` do expo.dev.

**O que fazer:**
1. Assinar em [developer.apple.com/programs](https://developer.apple.com/programs/) (individual por enquanto;
   organização exige empresa e número D-U-N-S).
2. Convidar o time no App Store Connect (*Users and Access*).
3. Garantir que todos estão na organização `cinediary` do expo.dev.

**DoD:**
- [ ] A assinatura está ativa.
- [ ] Quem vai gerar builds tem acesso ao App Store Connect e à organização no expo.dev.

---

### 9. Primeiro development build (EAS)
`app` · `infra` · **P** · Depende de: 8

**Contexto.** O development build é um "Expo Go do CineDiary", com todas as libs nativas. Ele é necessário para o
Instagram (card 10) e as notificações (card 11). Já está configurado:
- `cinediary-mobile/eas.json`: perfis `development`, `development-simulator`, `preview` e `production`;
- `expo-dev-client` instalado;
- `scripts/dev.mjs`, modo `build-dev`, chamado pelo `make build-dev`.

**O que fazer:**
1. `eas login` (conta da organização `cinediary`).
2. `make build-dev` (iOS): o EAS guia o certificado e o cadastro dos aparelhos (`eas device:create` para outras pessoas).
3. `make build-dev PLATFORM=android`.
4. Instalar pelos links e abrir com `make front DEV_CLIENT=1`.
5. Atualizar o README da raiz: tirar o aviso de "ainda não" da seção de build.

**DoD:**
- [ ] O app abre no development build nos celulares do time (iOS e Android).
- [ ] `make front DEV_CLIENT=1` conecta no development build.
- [ ] A transição splash nativa → animada fica sem "pulo" no build.
- [ ] O README explica o fluxo com development build.

---

### 10. Story direto nos Stories do Instagram
`app` · **M** · Depende de: 9

**Contexto.** Hoje "Compartilhar nos Stories" gera a imagem do registro e abre a folha de compartilhar do sistema. O
passo a passo completo está em `docs/guides/instagram-stories.md`. Tudo passa por
`cinediary-mobile/src/shared/sharing/storyShare.ts`.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| Meta for Developers | Criar o app (tipo "Consumidor") e copiar o App ID |
| `cinediary-mobile/package.json` | `npx expo install react-native-share` |
| `cinediary-mobile/.env.example` e `.env.local` | `EXPO_PUBLIC_FACEBOOK_APP_ID` |
| `cinediary-mobile/src/shared/config/env.ts` | Ler `facebookAppId` |
| `cinediary-mobile/app.json` | `LSApplicationQueriesSchemes` (iOS) e o plugin do `react-native-share` (Android) |
| `cinediary-mobile/src/shared/sharing/storyShare.ts` | `shareToStories` com `Share.shareSingle({ social: Share.Social.INSTAGRAM_STORIES, … })`; sem Instagram instalado, cai na folha do sistema |
| `cinediary-mobile/README.md` | A variável nova na seção de variáveis |

**DoD:**
- [ ] Com o Instagram instalado, o botão abre direto o editor de Stories com a arte.
- [ ] Sem o Instagram, abre a folha do sistema (como hoje).
- [ ] Funciona em iOS e Android.
- [ ] Evento `entry_shared` continua sendo registrado (com o destino).

---

### 11. Notificações push
`backend` · `app` · **G** · Depende de: 9

**Contexto.** O sino (`/me/notifications`) já existe e grava avisos na hora em que acontecem
(`.../modules/social/infrastructure/persistence/NotificationsAdapter.java`, método `add`, chamado pelos casos de uso
de seguir, curtir e responder). Falta mandar esses avisos para o celular.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `.../db/migration/V<próx>__push_devices.sql` (novo) | `push_devices (id, user_id, expo_token UNIQUE, platform, created_at, last_seen_at)` |
| `.../modules/users/...` ou `.../modules/social/...` | Rota `PUT /api/v1/me/devices` (registra o token) e `DELETE /api/v1/me/devices/{token}` (no logout) |
| `.../modules/social/infrastructure/push/ExpoPushClient.java` (novo) | `POST https://exp.host/--/api/v2/push/send`, em lotes, removendo tokens inválidos (`DeviceNotRegistered`) |
| `.../modules/social/application/...` | Ao criar um aviso, publicar um evento (ex.: `NotificationCreatedEvent`) e um listener `@ApplicationModuleListener` (assíncrono, pelo Outbox) monta o texto no idioma da pessoa e envia |
| `cinediary-mobile/package.json` | `npx expo install expo-notifications` |
| `cinediary-mobile/app.json` | Plugin `expo-notifications` (ícone e cor no Android) |
| `cinediary-mobile/src/shared/notifications/push.ts` (novo) | Pedir permissão, pegar o `ExpoPushToken` (com o `projectId` do `app.json`), mandar para a API |
| `cinediary-mobile/src/shared/auth/AuthProvider.tsx` | Registrar o token depois do login; apagar no logout |
| `cinediary-mobile/src/features/auth/presentation/screens/SettingsScreen.tsx` | Seção "Notificações" com liga/desliga por tipo (guardado no perfil) |
| Tocar na notificação | Abrir a tela certa (registro, perfil, pedidos) pelo `data` da notificação + `router.push` |

**Exemplo** (envio):
```java
record ExpoMessage(String to, String title, String body, Map<String, String> data) {}
rest.post().uri("https://exp.host/--/api/v2/push/send")
    .body(List.of(new ExpoMessage(token, "CineDiary", "Ana curtiu sua review de Duna", Map.of("entryId", id.toString()))))
    .retrieve().toBodilessEntity();
```

**DoD:**
- [ ] Curtir, responder, seguir e aprovar pedido fazem chegar uma notificação no celular da pessoa (nunca para si mesma).
- [ ] Curtidas no mesmo registro não viram uma rajada (agrupar ou limitar).
- [ ] Tocar na notificação abre a tela certa.
- [ ] A pessoa desliga cada tipo em Configurações; o pedido de permissão aparece numa hora com contexto (não na abertura).
- [ ] Tokens inválidos são removidos.
- [ ] Testes: registro de token, envio simulado (cliente falso) e preferências.

---

## Bloco 4: Features

### 12. Listas personalizadas
`backend` · `app` · **G** · *(sugestão de próxima feature)*

**Contexto.** Listas criadas pela pessoa ("Melhores de terror", "Para ver no Natal"), com ou sem ranking, públicas
ou privadas, curtíveis. É a feature mais pedida em apps de cinema e não depende de nada que falte.

**O que fazer (backend).** Novo módulo `lists` (`.../modules/lists/`, com `package-info.java` `@ApplicationModule`),
dependendo de `catalog` e `users`; a privacidade usa o `social` (perfil privado) pelo `SocialModulePort`.

| Arquivo | O que mudar |
| --- | --- |
| `.../db/migration/V<próx>__lists.sql` | `lists (id, user_id, name, description, ranked, visibility, created_at, updated_at)`, `list_items (list_id, title_id, position, note)`, `list_likes (list_id, user_id, created_at)` |
| `.../modules/lists/domain/` | `UserList`, `ListItem`, `ListsRepositoryPort` (regras: nome obrigatório, até 500 itens, sem título repetido) |
| `.../modules/lists/application/` | `CreateListUseCase`, `UpdateListUseCase`, `AddToListUseCase`, `ReorderListUseCase`, `GetListUseCase`, `ListsOfUserUseCase`, `LikeListUseCase` |
| `.../modules/lists/presentation/ListsController.java` | `GET /users/{u}/lists`, `POST /lists`, `GET/PATCH/DELETE /lists/{id}`, `POST /lists/{id}/items`, `PUT /lists/{id}/items/order`, `PUT/DELETE /lists/{id}/like`, `GET /titles/{id}/my-lists` (em quais listas o título está) |
| `.../architecture/ArchitectureFitnessTest.java` | Incluir `lists` na lista de módulos |
| `docs/architecture/openapi-v1.yaml` | Todas as rotas |

**O que fazer (app).** Nova feature `cinediary-mobile/src/features/lists/` com as 4 camadas.

| Arquivo | O que mudar |
| --- | --- |
| `features/lists/infrastructure/listsApi.ts` | Chamadas |
| `features/lists/application/listsQueries.ts` | Hooks (otimistas ao adicionar, reordenar e curtir) |
| `features/lists/presentation/screens/` | `ListScreen` (ver), `EditListScreen` (criar/editar, reordenar arrastando: reaproveitar o padrão de `SortableFavorites.tsx`) |
| `features/lists/presentation/components/AddToListSheet.tsx` | "Adicionar à lista" (folha com as listas + "Nova lista") |
| `src/app/lists/[listId].tsx`, `src/app/lists/new.tsx` | Rotas (registrar no `RootNavigator`) |
| `features/catalog/presentation/screens/TitleDetailScreen.tsx` | Ação "Adicionar à lista" |
| `features/social/presentation/components/ProfileHeader.tsx` (ou a tela de perfil) | Seção "Listas" no perfil (seu e dos outros) |

**DoD:**
- [ ] Criar, editar, excluir lista; adicionar e remover títulos; reordenar arrastando.
- [ ] Lista privada e perfil privado respeitados (403 para quem não pode ver).
- [ ] Curtir a lista de alguém gera aviso no sino (novo `NotificationKind.LIST_LIKED`).
- [ ] Testes de integração das regras (privacidade, limite, repetidos, ordem).
- [ ] Eventos: `list_created`, `list_item_added`, `list_liked`.

---

### 13. Marcação de amigos ("vi com…")
`backend` · `app` · **G**

**Contexto.** Ao registrar, marcar com quem assistiu. A pessoa marcada aprova ou recusa; aprovada, aparece no registro.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `.../db/migration/V<próx>__entry_tags.sql` | `entry_tags (entry_id, tagged_user_id, status PENDING/ACCEPTED/DECLINED, created_at)`, PK `(entry_id, tagged_user_id)` |
| `.../modules/diary/presentation/dto/CreateDiaryEntryRequest.java` e `UpdateDiaryEntryRequest.java` | Campo `taggedUsernames` |
| `.../modules/social/domain/NotificationKind.java` | `ENTRY_TAGGED` (e o CHECK da tabela `notifications` numa migração) |
| `.../modules/social/application/` | `EntryTagsUseCase`: só pode marcar quem você segue e te segue (evita spam); aprovar e recusar (`POST /me/tags/{entryId}/accept` e `/decline`) |
| Respostas de registro (`PersonEntryResponse`, `DiaryEntryResponse`) | `taggedWith: [{username, displayName, avatarUrl}]` só com as marcações aceitas |
| `cinediary-mobile/src/features/diary/presentation/components/QuickLogForm.tsx` e `EntryEditForm.tsx` | Campo "Vi com…" (busca de pessoas: reaproveitar `usePeopleSearch`) |
| `cinediary-mobile/src/features/social/presentation/screens/NotificationsScreen.tsx` | Aviso com "Aceitar" e "Recusar" |
| `cinediary-mobile/src/features/diary/presentation/components/EntryDetail.tsx` | "Com @ana e @bia" |

**DoD:**
- [ ] Marcar gera aviso; aceitar mostra a marcação; recusar some sem avisar quem marcou.
- [ ] Não dá para marcar quem não é amigo (segue e é seguido).
- [ ] A pessoa pode remover uma marcação já aceita.
- [ ] Testes: permissões, aceitar, recusar, remover.

---

### 14. Notas por temporada (exibir)
`app` · `backend` · **M**

**Contexto.** **Já dá** para registrar uma temporada com nota: um registro de escopo "temporada" (`diary_entries.season_number`,
e `LogScope = 'season'` no app). O que falta é **mostrar**: a sua nota de cada temporada na lista de temporadas e,
opcional, a média do público por temporada.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-mobile/src/features/catalog/presentation/components/SeriesProgressSection.tsx` | Mostrar ★ da sua última nota de cada temporada ao lado do nome |
| `cinediary-mobile/src/features/diary/application/diaryQueries.ts` (`useTitleEntries`) | Já traz os registros do título: derivar `notaPorTemporada` dos registros de escopo temporada |
| (opcional) `.../modules/social/application/GetTitleCommunityUseCase.java` | Média por temporada |

**DoD:**
- [ ] A lista de temporadas mostra a sua nota de cada uma (quando houver).
- [ ] Nada muda para filmes.

---

### 15. Movie Blend (Match em grupo)
`backend` · `app` · `design` · **GG** (quebrar antes de começar)

**Contexto.** O Taste Match para um grupo. Reaproveita o motor do `match` (`TasteSimilarityCalculator`,
`Neo4jGdsTasteMatchEngineAdapter`) e o Story (`features/match/presentation/components/story/`).

**Cards a criar a partir deste:**
1. **Design:** fluxo de criar o grupo, convidar, esperar e "Iniciar Blend"; o Story do grupo.
2. **Backend: grupos e convites.** Tabelas `blends` e `blend_members`, link de convite (reaproveitar `InviteCodes`), entrar e sair.
3. **Backend: cálculo do grupo.** Compatibilidade de cada par e a média; o "gosto do grupo" no grafo.
4. **Backend: recomendações para o grupo** (`CollaborativeRecommendationPort` para N pessoas).
5. **App:** telas do grupo, convites e o Story do Blend.

**DoD:** definida em cada card filho.

---

### 16. Cinematic DNA
`backend` · `app` · `design` · **G**

**Contexto.** O "perfil de gosto" da pessoa (gêneros, décadas, diretores, ritmo), numa arte para compartilhar. Parte
dos dados já existe em `.../modules/stats/` (`GetUserStatsUseCase`) e no grafo do `match`.

**O que fazer:** endpoint `GET /api/v1/users/{u}/dna` (novo caso de uso em `stats`), tela no perfil e uma arte para os
Stories (reaproveitar `EntryStoryCard` e o `storyShare.ts`).

**DoD:**
- [ ] A tela mostra o DNA com pelo menos 10 registros; com menos, um convite para registrar mais.
- [ ] A arte compartilhável respeita o perfil privado (só a própria pessoa compartilha).

---

### 17. Cinematic Wrapped
`backend` · `app` · `design` · **G**

**Contexto.** A retrospectiva do ano em Stories. Só faz sentido com um ano de dados: mirar o primeiro dezembro com usuários.

**O que fazer:** endpoint `GET /api/v1/me/wrapped/{ano}` (em `stats`), Story com slides (reaproveitar o player do
Match: `features/match/application/useStoryPlayer.ts`) e uma arte por slide para compartilhar.

**DoD:**
- [ ] Os números batem com o diário do ano (teste de integração com um ano montado).
- [ ] Disponível a partir de 1º de dezembro, com aviso no sino.

---

### 18. Conversational Discovery (IA)
`backend` · `app` · **G**

**Contexto.** Pedir recomendação conversando ("quero algo leve para hoje, com a Ana"), usando o gosto da pessoa
(diário, grafo) e o catálogo.

**O que fazer:** novo módulo no backend que chama um modelo de linguagem com o contexto do gosto e devolve títulos do
catálogo (nunca inventados: sempre validados no TMDB); tela de conversa no app. Custo por pedido e limite diário por usuário.

**DoD:**
- [ ] Toda recomendação é um título real do catálogo, com link para a página.
- [ ] Limite de uso por dia e custo monitorado.
- [ ] Nada de dados pessoais enviados além do necessário (sem e-mail, sem nome).

---

### 19. Notificações contextuais e descoberta por lançamentos
`backend` · `app` · **G** · Depende de: 11

**Contexto.** "Estreou um filme do diretor que você ama", "saiu a nova temporada da série que você está vendo".

**O que fazer:** tarefa agendada (`@Scheduled`) no backend que cruza lançamentos do TMDB com o diário e o grafo de
cada pessoa e cria avisos no sino (e push, card 11). Preferência em Configurações.

**DoD:**
- [ ] No máximo 1 aviso desses por pessoa por dia.
- [ ] Série em andamento (`WATCHING`) recebe aviso de temporada nova.
- [ ] A pessoa desliga em Configurações.

---

### 20. Outros provedores de importação
`backend` · `app` · **M** (cada)

**Contexto.** Hoje só o Letterboxd (`.../modules/importing/infrastructure/letterboxd/`). Fazer sob demanda (IMDb, Trakt, TV Time).

**O que fazer:** um leitor por provedor ao lado do `letterboxd/`, gerando os mesmos `ImportedItemCommand`
(`.../modules/diary/api/ImportedItemCommand.java`); o resto do fluxo (resumo, confirmar, idempotência) é o mesmo. No app,
escolher o provedor em `features/importing/presentation/screens/ImportScreen.tsx`.

**DoD:**
- [ ] Importar o arquivo do provedor gera o mesmo resumo e é idempotente (reimportar não duplica).
- [ ] Testes com um arquivo de exemplo do provedor.

---

## Bloco 5: Lançamento

### 21. Exclusão de conta dentro do app
`app` · `backend` · **M** · **Obrigatório para a App Store**

**Contexto.** A Apple exige que todo app com cadastro permita excluir a conta **pelo próprio app**, ou ela recusa na
revisão. O backend **já trata** a exclusão: o webhook `user.deleted` do Clerk faz o soft delete
(`.../modules/users/application/SyncClerkUserUseCase.java`), e a conta excluída responde 403. Falta o botão.

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| Painel do Clerk | Permitir que usuários excluam a própria conta |
| `cinediary-mobile/src/features/auth/application/usePasswordAuth.ts` | `useDeleteAccount()`: `await user.delete()` (do `useUser()` do `@clerk/expo`), registra o evento e faz o logout |
| `cinediary-mobile/src/features/auth/presentation/screens/SettingsScreen.tsx` | Seção "Conta" → "Excluir conta" (vermelho) com confirmação no `ActionSheet` (digitar o @ ou confirmar duas vezes) |
| `cinediary-mobile/src/shared/i18n/pt/account.ts` e `en/account.ts` | Textos (o que acontece com os dados, que não dá para desfazer) |
| `cinediary-mobile/src/shared/analytics/events.ts` | `account_deleted` (sem propriedades pessoais) |
| `.../modules/users/...` (opcional) | `DELETE /api/v1/me` como plano B se o webhook atrasar: marca a conta como excluída na hora |

**Exemplo:**
```ts
export function useDeleteAccount() {
  const { user } = useUser();
  const signOut = useSignOut();
  return useMutation({
    mutationFn: async () => {
      analytics.track('account_deleted', {});
      await user?.delete();
    },
    onSuccess: () => signOut(),
  });
}
```

**DoD:**
- [ ] Excluir pelo app remove o login; a pessoa volta para as boas-vindas.
- [ ] O perfil e os registros deixam de aparecer para os outros (conta com soft delete).
- [ ] Teste de integração: depois do `user.deleted`, as rotas da pessoa respondem 403 e ela some do feed e da busca.
- [ ] O texto deixa claro que não dá para desfazer.

---

### 22. Privacidade e LGPD
`produto` · `backend` · `app` · **M**

**Contexto.** Para publicar: termos de uso e política de privacidade (links no cadastro e em Configurações), exportar os
próprios dados (LGPD) e revisar o que vai para terceiros (Clerk, PostHog, TMDB).

**O que fazer:**

| Arquivo | O que mudar |
| --- | --- |
| Páginas web (fora do app) | Termos e política de privacidade publicados num endereço público |
| `cinediary-mobile/src/features/auth/presentation/screens/SignUpScreen.tsx` | "Ao criar a conta, você concorda com os Termos e a Política" com os links |
| `cinediary-mobile/src/features/auth/presentation/screens/SettingsScreen.tsx` | Links e "Exportar meus dados" |
| `.../modules/users/presentation/MeController.java` | `GET /api/v1/me/export`: JSON com perfil, diário, watchlist, listas, seguidores |
| `cinediary-mobile/src/shared/analytics/` | Revisar que nenhum evento leva dados pessoais; opção de desligar analytics em Configurações |

**DoD:**
- [ ] Os links aparecem no cadastro e em Configurações.
- [ ] "Exportar meus dados" entrega um arquivo com tudo da pessoa (e só dela).
- [ ] Desligar analytics para de enviar eventos ao PostHog.

---

### 23. Variáveis de produção no EAS e ambiente de homologação
`infra` · **M**

**Contexto.** Os builds `preview` e `production` (`cinediary-mobile/eas.json`) não leem o `.env.local` do seu
computador: as chaves precisam estar cadastradas no EAS. E eles precisam de uma API pública (não `localhost`).

**O que fazer:**
1. Subir uma API de **homologação**: servidor com Docker (o `cinediary-backend/Dockerfile` já existe), PostgreSQL e
   Neo4j gerenciados ou em containers, domínio com HTTPS, `.env` de homologação.
2. Um projeto do PostHog e uma instância do Clerk por ambiente (dev e produção), com o webhook do Clerk apontando para a
   API pública (sem Svix Play).
3. Cadastrar as variáveis no EAS:
   ```bash
   eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://api-hml.cinediary.app
   eas env:create --environment preview --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_test_...
   eas env:create --environment preview --name EXPO_PUBLIC_POSTHOG_API_KEY --value phc_...
   eas env:create --environment preview --name EXPO_PUBLIC_POSTHOG_HOST --value https://us.i.posthog.com
   # repetir com --environment production
   ```
4. Documentar os ambientes no README da raiz.

**DoD:**
- [ ] Um build `preview` instalado no celular fala com a API de homologação.
- [ ] O webhook do Clerk chega na homologação.
- [ ] Nenhum segredo commitado; os do backend ficam no servidor.

---

### 24. CD: builds e deploy automáticos
`infra` · **M** · Depende de: 1, 8, 23

**O que fazer:**

| Arquivo (novo) | O que faz |
| --- | --- |
| `.github/workflows/deploy-api.yml` | Na `main`, com o CI verde: gera a imagem do `cinediary-backend/Dockerfile`, publica e faz o deploy na homologação |
| `.github/workflows/release-app.yml` | Numa tag `v*`: `eas build --profile production --platform all --auto-submit --non-interactive` (TestFlight e Play Console, teste interno) |
| `.github/workflows/update-app.yml` (opcional) | Correções só de JavaScript: `eas update --branch production` |

Segredos no GitHub: `EXPO_TOKEN` (expo.dev → Access tokens) e os do servidor de homologação.

**DoD:**
- [ ] Um merge na `main` atualiza a homologação sozinho.
- [ ] Uma tag `v0.2.0` gera os builds e manda para o TestFlight e a Play Console.
- [ ] O número do build sobe sozinho (`autoIncrement` no `eas.json`).

---

### 25. Monitoramento em produção
`infra` · `backend` · **M**

**Contexto.** Os erros do app já vão para o PostHog (`cinediary-mobile/src/shared/analytics/analytics.tsx`,
`posthogLogger`). Falta o backend e os alertas.

**O que fazer:**
- **Backend:** capturar exceções não tratadas (em `.../shared/infrastructure/web/ApiExceptionHandler.java`, os 5xx)
  e mandar para uma ferramenta de erros (PostHog ou Sentry), com o id da requisição e sem dados pessoais.
- **Saúde:** monitor externo chamando `/actuator/health` a cada minuto, com alerta (e-mail ou Slack) se cair.
- **Lentidão:** métricas do Actuator (tempo por rota) num painel.

**DoD:**
- [ ] Um 500 forçado em homologação aparece na ferramenta de erros em até 1 minuto.
- [ ] Derrubar a API dispara o alerta.
- [ ] Nenhum dado pessoal (e-mail, texto de review) nos erros.

---

### 26. Beta fechado
`produto` · **M** · Depende de: 21, 22, 23

**O que fazer:** grupo de teste no TestFlight (até 10 mil pessoas por link) e no teste interno da Play Console; um
jeito fácil de mandar feedback (link em Configurações, ou o feedback do próprio TestFlight); acompanhar crashes e
eventos no PostHog.

**DoD:**
- [ ] Pelo menos 10 pessoas usando por 2 semanas.
- [ ] Feedbacks viram cards neste Project.
- [ ] Os crashes críticos estão corrigidos antes do card 27.

---

### 27. Publicação nas lojas
`produto` · `design` · **M** · Depende de: 26

**O que fazer:** prints (iPhone e Android), textos das lojas em PT e EN, ícone final, classificação etária, URL da
política de privacidade, as respostas de "privacidade do app" da Apple (quais dados coletamos) e o envio para revisão.

**DoD:**
- [ ] Aprovado na App Store e na Play Store.
- [ ] Os textos e prints refletem o app atual.

---

## Bloco 6: Futuro

### 28. Monetização
`produto` · `backend` · `app` · **GG**

Premium (RevenueCat), limites do plano grátis e anúncios só no grátis. Só depois de comprovar retenção (ver
`docs/Mvp Inicial.md`, seção "Fora do MVP"). Quebrar em cards quando for a hora.

### 29. Versão Web
`produto` · **GG**

Perfis, diário, reviews, listas e feed na web, reaproveitando a API (contrato em `docs/architecture/openapi-v1.yaml`).
Quebrar em cards quando for a hora.

---

## Ordem sugerida
1. **Dev:** 2 → 1 → 3.
2. **Features:** 12 (listas) → 13 (marcação).
3. **Pendências pequenas** (4 a 7) entre uma feature e outra.
4. **Quando assinarem a Apple:** 8 → 9 → 10 e 11.
5. **Antes do beta:** 21, 22, 23, 25 → 26 → 27.
