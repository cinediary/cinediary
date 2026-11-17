# CineDiary: o que falta fazer

Mapa para virar cards no GitHub Projects. Cada `###` é um card: o título já está pronto para colar e o texto abaixo
dele vai na descrição. Os caminhos de arquivo são relativos à raiz do repositório.

**Legenda** (os mesmos campos do Project *CineDiary Planning*):
- **Labels:** `backend`, `app`, `infra`, `design`, `produto`.
- **Size:** **XS** (minutos a poucas horas), **S** (até 1 dia), **M** (alguns dias), **L** (1 a 2 semanas), **XL** (épico:
  quebrar em sub-issues antes de começar).
- **Priority** (campo da organização): **Urgent**, **High**, **Medium**, **Low**.
- **Bloco:** Dev, Pendências, Development build, Features, Lançamento, Futuro.
- **Iteration:** a quinzena planejada (1: 16 a 29 nov · 2: 30 nov a 13 dez · 3: 14 a 27 dez); **—** = ainda no Backlog.
- **Sub-issues:** os cards grandes (#11, #12, #15 e #28) listam as sub-issues numeradas como `12.1`, `12.2`…
  Crie a issue principal e, dentro dela, cada sub-issue em **Create sub-issue**, colando o trecho `####` dela.
- **Bloqueado por / Bloqueia:** números **dos cards deste arquivo**. No GitHub, os números das issues são outros:
  marque em *Relationships → Mark as blocked by* procurando pelo título.


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

### 1. Configurar CI com GitHub Actions
`infra` · **Size:** M · **Priority:** Urgent · **Bloco:** Dev · **Iteration:** 1 · **Bloqueado por:** #2 · **Bloqueia:** #24

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

### 2. Proteger a branch `main` no GitHub
`infra` · **Size:** XS · **Priority:** Urgent · **Bloco:** Dev · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** #1

**Contexto.** O repositório `cinediary/cinediary` já existe e a `main` já está no GitHub. Falta impedir push direto na
`main`, para todo código entrar por pull request revisado (e, depois do #1, com o CI verde).

**O que fazer:** no repositório, **Settings → Branches → Add branch ruleset** (ou *Add rule*) para a `main`:
- **Require a pull request before merging**, com **1 aprovação**;
- **Require status checks to pass**: marcar os checks do CI quando o #1 estiver pronto;
- **Block force pushes** e **Restrict deletions**.

**DoD:**
- [ ] Push direto na `main` é recusado.
- [ ] Um PR sem aprovação não pode ser mesclado.
- [ ] Depois do #1, um PR com o CI vermelho não pode ser mesclado.
- [ ] O README da raiz diz que o fluxo é branch + PR.

---

### 3. Rodar os testes do backend com OrbStack e Colima
`infra` `backend` · **Size:** S · **Priority:** High · **Bloco:** Dev · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 4. Salvar na conta quem já viu o Story do Match
`backend` `app` · **Size:** S · **Priority:** Medium · **Bloco:** Pendências · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 5. Mostrar onde assistir na página do título
`backend` `app` · **Size:** M · **Priority:** Medium · **Bloco:** Pendências · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 6. Conferir o ícone do iOS num build
`design` `app` · **Size:** XS · **Priority:** Medium · **Bloco:** Pendências · **Iteration:** 2 · **Bloqueado por:** #9 · **Bloqueia:** —

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

### 7. Avisar quando a internet cair durante o uso
`app` · **Size:** S · **Priority:** Medium · **Bloco:** Pendências · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 8. Assinar o Apple Developer Program
`produto` · **Size:** S · **Priority:** Medium · **Bloco:** Development build · **Iteration:** 2 · **Bloqueado por:** — · **Bloqueia:** #9, #24

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

### 9. Gerar o primeiro development build
`app` `infra` · **Size:** S · **Priority:** Medium · **Bloco:** Development build · **Iteration:** 2 · **Bloqueado por:** #8 · **Bloqueia:** #6, #10, #11

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

### 10. Compartilhar o registro direto nos Stories do Instagram
`app` · **Size:** M · **Priority:** Medium · **Bloco:** Development build · **Iteration:** 2 · **Bloqueado por:** #9 · **Bloqueia:** —

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

### 11. Enviar notificações push do sino
`backend` `app` · **Size:** L · **Priority:** Medium · **Bloco:** Development build · **Iteration:** 2 · **Bloqueado por:** #9 · **Bloqueia:** #19

**Issue grande, com sub-issues.** A issue principal tem só o objetivo e a DoD geral; o trabalho fica nas sub-issues abaixo
(crie cada uma dentro desta issue, em **Create sub-issue**).

**Objetivo.** O sino (`/me/notifications`) já existe: os avisos são gravados na hora em que acontecem
(`cinediary-backend/src/main/java/com/cinediary/api/modules/social/infrastructure/persistence/NotificationsAdapter.java`, método `add`). Falta mandar esses avisos
para o celular, com a pessoa escolhendo o que recebe.

**Sub-issues:**

| # | Título | Labels | Size | Bloqueado por |
| --- | --- | --- | --- | --- |
| 11.1 | Registrar os aparelhos para notificações push | `backend` | S | — |
| 11.2 | Enviar push quando um aviso do sino é criado | `backend` | M | 11.1 |
| 11.3 | Pedir permissão e registrar o aparelho no app | `app` | S | 11.1, #9 |
| 11.4 | Abrir a tela certa ao tocar na notificação | `app` | S | 11.3 |
| 11.5 | Escolher quais notificações receber | `backend` `app` | S | 11.2 |

**DoD geral:**
- [ ] Todas as sub-issues fechadas.
- [ ] Curtir, responder, seguir e aprovar pedido fazem chegar uma notificação no celular da pessoa (nunca para si mesma).
- [ ] Testado em iOS e Android num development build.

#### 11.1 Registrar os aparelhos para notificações push
`backend` · **Size:** S · **Bloqueado por:** —

Guardar o token de push de cada aparelho da pessoa.

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-backend/src/main/resources/db/migration/V<próx>__push_devices.sql` (novo) | `push_devices (id, user_id, expo_token UNIQUE, platform, created_at, last_seen_at)` |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/users/presentation/MeController.java` | `PUT /api/v1/me/devices` (cria ou atualiza o token) e `DELETE /api/v1/me/devices/{token}` (no logout) |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/users/...` (domain, application, persistence) | Caso de uso e adapter dos aparelhos; o `api/` do `users` expõe "tokens da pessoa" para o `social` |
| `docs/architecture/openapi-v1.yaml` | As duas rotas |

**DoD:**
- [ ] O mesmo token não duplica; um token que muda de dono passa para a pessoa nova.
- [ ] Teste de integração: registrar, atualizar, apagar.

#### 11.2 Enviar push quando um aviso do sino é criado
`backend` · **Size:** M · **Bloqueado por:** 11.1

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/social/...` | Ao gravar um aviso (`NotificationsAdapter.add`), publicar um evento (ex.: `NotificationCreatedEvent`) |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/social/application/PushListener.java` (novo) | `@ApplicationModuleListener` (assíncrono, pelo Outbox): monta o texto no idioma da pessoa e envia |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/social/infrastructure/push/ExpoPushClient.java` (novo) | `POST https://exp.host/--/api/v2/push/send` em lotes; remove os tokens com `DeviceNotRegistered` |

```java
record ExpoMessage(String to, String title, String body, Map<String, String> data) {}
rest.post().uri("https://exp.host/--/api/v2/push/send")
    .body(List.of(new ExpoMessage(token, "CineDiary", "Ana curtiu sua review de Duna", Map.of("entryId", id.toString()))))
    .retrieve().toBodilessEntity();
```

**DoD:**
- [ ] Curtidas no mesmo registro não viram uma rajada (agrupar em alguns minutos ou mandar uma só).
- [ ] O texto sai no idioma da pessoa (PT ou EN).
- [ ] Teste de integração com um cliente de push falso: o envio acontece e os tokens inválidos somem.

#### 11.3 Pedir permissão e registrar o aparelho no app
`app` · **Size:** S · **Bloqueado por:** 11.1, #9

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-mobile/package.json` | `npx expo install expo-notifications` |
| `cinediary-mobile/app.json` | Plugin `expo-notifications` (ícone e cor no Android) |
| `cinediary-mobile/src/shared/notifications/push.ts` (novo) | Pedir permissão, pegar o `ExpoPushToken` (com o `projectId` do `app.json`) e mandar para a API |
| `cinediary-mobile/src/shared/auth/AuthProvider.tsx` | Registrar depois do login; apagar no logout |

**DoD:**
- [ ] O pedido de permissão aparece numa hora com contexto (ex.: depois do primeiro "seguir"), não na abertura.
- [ ] Recusar a permissão não quebra nada.

#### 11.4 Abrir a tela certa ao tocar na notificação
`app` · **Size:** S · **Bloqueado por:** 11.3

Com o `data` da notificação (`entryId`, `username`…), abrir o registro, o perfil ou os pedidos com `router.push`, inclusive
com o app fechado.

**DoD:**
- [ ] Tocar abre a tela certa com o app aberto, em segundo plano e fechado.

#### 11.5 Escolher quais notificações receber
`backend` `app` · **Size:** S · **Bloqueado por:** 11.2

Seção "Notificações" em `cinediary-mobile/src/features/auth/presentation/screens/SettingsScreen.tsx`, com liga/desliga por tipo
(seguidores, curtidas, respostas), guardado no perfil (`PATCH /api/v1/me`). O envio (11.2) respeita a escolha.

**DoD:**
- [ ] Desligar um tipo para de mandar esse tipo; o sino continua mostrando.
- [ ] Textos em PT e EN; evento `setting_changed`.

---

## Bloco 4: Features

### 12. Criar listas personalizadas
`backend` `app` · **Size:** L · **Priority:** High · **Bloco:** Features · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

**Issue grande, com sub-issues.** A issue principal tem só o objetivo e a DoD geral; o trabalho fica nas sub-issues.

**Objetivo.** Listas criadas pela pessoa ("Melhores de terror", "Para ver no Natal"), com ou sem ranking, públicas ou
privadas, que outras pessoas podem curtir. No backend, um módulo novo `lists` (depende de `catalog` e `users`; a
privacidade usa o `social` pelo `SocialModulePort`). No app, uma feature nova `cinediary-mobile/src/features/lists/`.

**Sub-issues:**

| # | Título | Labels | Size | Bloqueado por |
| --- | --- | --- | --- | --- |
| 12.1 | Criar o módulo de listas no backend | `backend` | M | — |
| 12.2 | Adicionar, remover e reordenar títulos de uma lista | `backend` | S | 12.1 |
| 12.3 | Curtir listas e avisar no sino | `backend` | S | 12.1 |
| 12.4 | Ver, criar e editar listas no app | `app` | M | 12.1 |
| 12.5 | Adicionar à lista pela página do título e reordenar | `app` | M | 12.2, 12.4 |
| 12.6 | Curtir listas no app | `app` | XS | 12.3, 12.4 |

**DoD geral:**
- [ ] Todas as sub-issues fechadas.
- [ ] Dá para criar uma lista, adicionar e reordenar títulos e ver a lista de um amigo (e não a de um perfil privado
      que você não segue).
- [ ] Eventos `list_created`, `list_item_added` e `list_liked` registrados.

#### 12.1 Criar o módulo de listas no backend
`backend` · **Size:** M · **Bloqueado por:** —

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-backend/src/main/resources/db/migration/V<próx>__lists.sql` (novo) | `lists (id, user_id, name, description, ranked, visibility, created_at, updated_at)` e `list_items (list_id, title_id, position, note)` |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/lists/package-info.java` (novo) | `@ApplicationModule(displayName = "Lists")` |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/lists/domain/` (novo) | `UserList`, `ListItem`, `ListsRepositoryPort`. Regras: nome obrigatório, até 500 itens, sem título repetido |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/lists/application/` (novo) | `CreateListUseCase`, `UpdateListUseCase`, `DeleteListUseCase`, `GetListUseCase`, `ListsOfUserUseCase` |
| `cinediary-backend/src/main/java/com/cinediary/api/modules/lists/presentation/ListsController.java` (novo) | `GET /users/{u}/lists`, `POST /lists`, `GET/PATCH/DELETE /lists/{id}` |
| `cinediary-backend/src/test/java/com/cinediary/api/architecture/ArchitectureFitnessTest.java` | Incluir `lists` na lista de módulos |
| `docs/architecture/openapi-v1.yaml` | As rotas |

**DoD:**
- [ ] Lista privada e perfil privado: 403 para quem não pode ver.
- [ ] Só o dono edita e exclui.
- [ ] Testes de integração das regras.

#### 12.2 Adicionar, remover e reordenar títulos de uma lista
`backend` · **Size:** S · **Bloqueado por:** 12.1

Rotas `POST /lists/{id}/items`, `DELETE /lists/{id}/items/{titleId}`, `PUT /lists/{id}/items/order` e
`GET /titles/{id}/my-lists` (em quais listas suas o título está, para o app marcar).

**DoD:**
- [ ] Título repetido na mesma lista é recusado; a ordem é mantida depois de reordenar.
- [ ] Testes de integração.

#### 12.3 Curtir listas e avisar no sino
`backend` · **Size:** S · **Bloqueado por:** 12.1

`list_likes (list_id, user_id, created_at)`, rotas `PUT/DELETE /lists/{id}/like`, um novo `NotificationKind.LIST_LIKED`
(e o `CHECK` da tabela `notifications` numa migração) e a curtida na atividade dos amigos.

**DoD:**
- [ ] Curtir de novo não duplica; descurtir apaga o aviso.
- [ ] Testes de integração.

#### 12.4 Ver, criar e editar listas no app
`app` · **Size:** M · **Bloqueado por:** 12.1

| Arquivo | O que mudar |
| --- | --- |
| `cinediary-mobile/src/features/lists/infrastructure/listsApi.ts` (novo) | Chamadas |
| `cinediary-mobile/src/features/lists/application/listsQueries.ts` (novo) | Hooks (TanStack Query) |
| `cinediary-mobile/src/features/lists/presentation/screens/ListScreen.tsx` e `EditListScreen.tsx` (novos) | Ver a lista; criar e editar (nome, descrição, ranking, pública ou privada) |
| `cinediary-mobile/src/app/lists/[listId].tsx` e `cinediary-mobile/src/app/lists/new.tsx` (novos) | Rotas (registrar no `RootNavigator`) |
| Perfil (`cinediary-mobile/src/features/stats/presentation/screens/ProfileScreen.tsx` e `cinediary-mobile/src/features/social/presentation/screens/PersonProfileScreen.tsx`) | Seção "Listas" |

**DoD:**
- [ ] O seu perfil e o dos outros mostram as listas (respeitando privacidade).
- [ ] Textos em PT e EN; exemplo no catálogo do Design System.

#### 12.5 Adicionar à lista pela página do título e reordenar
`app` · **Size:** M · **Bloqueado por:** 12.2, 12.4

"Adicionar à lista" na página do título (`cinediary-mobile/src/features/catalog/presentation/screens/TitleDetailScreen.tsx`), abrindo
uma folha com as suas listas (marcadas as que já têm o título) e "Nova lista". Reordenar arrastando na tela da lista,
reaproveitando o padrão de `cinediary-mobile/src/features/auth/presentation/components/SortableFavorites.tsx`.

**DoD:**
- [ ] Adicionar e remover são otimistas (a tela muda na hora).
- [ ] Reordenar salva a ordem nova.

#### 12.6 Curtir listas no app
`app` · **Size:** XS · **Bloqueado por:** 12.3, 12.4

Botão de curtir na tela da lista (reaproveitar `cinediary-mobile/src/shared/ui/LikeButton.tsx`), com o contador; aviso
"curtiu sua lista" no sino (`cinediary-mobile/src/features/social/presentation/screens/NotificationsScreen.tsx`).

**DoD:**
- [ ] Curtir é otimista; o aviso aparece para o dono da lista.

---

### 13. Marcar amigos num registro ("vi com…")
`backend` `app` · **Size:** L · **Priority:** High · **Bloco:** Features · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 14. Mostrar a nota de cada temporada nas séries
`app` `backend` · **Size:** M · **Priority:** Medium · **Bloco:** Features · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** —

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

### 15. Movie Blend: Taste Match em grupo
`backend` `app` `design` · **Size:** XL · **Priority:** Low · **Bloco:** Features · **Iteration:** — · **Bloqueado por:** — · **Bloqueia:** —

**Issue grande, com sub-issues.** O Taste Match para um grupo. Reaproveita o motor do `match`
(`TasteSimilarityCalculator`, `Neo4jGdsTasteMatchEngineAdapter`) e o player do Story
(`cinediary-mobile/src/features/match/presentation/components/story/`).

**Sub-issues:**

| # | Título | Labels | Size | Bloqueado por |
| --- | --- | --- | --- | --- |
| 15.1 | Desenhar o fluxo e o Story do Movie Blend | `design` | M | — |
| 15.2 | Criar grupos e convites do Blend no backend | `backend` | M | 15.1 |
| 15.3 | Calcular a compatibilidade do grupo | `backend` | L | 15.2 |
| 15.4 | Recomendar títulos para o grupo | `backend` | M | 15.3 |
| 15.5 | Criar o grupo, convidar e iniciar o Blend no app | `app` | M | 15.1, 15.2 |
| 15.6 | Mostrar o Story e as recomendações do Blend | `app` | M | 15.3, 15.4, 15.5 |

**DoD geral:**
- [ ] Todas as sub-issues fechadas.
- [ ] Um grupo de 3 a 8 pessoas vê a compatibilidade do grupo e o que assistir junto.

#### 15.1 Desenhar o fluxo e o Story do Movie Blend
`design` · **Size:** M · **Bloqueado por:** —

Telas de criar o grupo, convidar, esperar os convidados e "Iniciar Blend"; os slides do Story do grupo; o que acontece
quando alguém sai. Referências: o Story do Match e `docs/design/UX-02-a-05-Fluxos-e-Telas.md`.

**DoD:**
- [ ] Fluxo e Story aprovados pelo time; casos de borda definidos (grupo pequeno, alguém sem registros).

#### 15.2 Criar grupos e convites do Blend no backend
`backend` · **Size:** M · **Bloqueado por:** 15.1

Tabelas `blends` e `blend_members`; link de convite (reaproveitar `cinediary-backend/src/main/java/com/cinediary/api/modules/match/domain/InviteCodes.java`); entrar,
sair e "Iniciar" (fecha o grupo). Rotas em `cinediary-backend/src/main/java/com/cinediary/api/modules/match/presentation/` (ou um módulo `blend` novo, se crescer).

**DoD:**
- [ ] Só quem criou inicia; depois de iniciado, ninguém entra.
- [ ] Testes de integração.

#### 15.3 Calcular a compatibilidade do grupo
`backend` · **Size:** L · **Bloqueado por:** 15.2

Compatibilidade de cada par (o motor que já existe) e a do grupo; os gêneros e títulos que o grupo tem em comum,
calculados no Neo4j, com o mesmo plano B no PostgreSQL.

**DoD:**
- [ ] O resultado é o mesmo pelo Neo4j e pelo plano B (teste como o do Match).

#### 15.4 Recomendar títulos para o grupo
`backend` · **Size:** M · **Bloqueado por:** 15.3

Estender o `CollaborativeRecommendationPort` para N pessoas: títulos que ninguém viu e que combinam com o grupo.

**DoD:**
- [ ] As recomendações não incluem o que alguém do grupo já viu.

#### 15.5 Criar o grupo, convidar e iniciar o Blend no app
`app` · **Size:** M · **Bloqueado por:** 15.1, 15.2

Telas na aba Juntos (`cinediary-mobile/src/features/match/`): criar, compartilhar o link, ver quem entrou, iniciar.

**DoD:**
- [ ] O link de convite abre o app direto no grupo.

#### 15.6 Mostrar o Story e as recomendações do Blend
`app` · **Size:** M · **Bloqueado por:** 15.3, 15.4, 15.5

O Story do grupo (reaproveitar `cinediary-mobile/src/features/match/application/useStoryPlayer.ts`) e a lista de recomendações.

**DoD:**
- [ ] O Story pode ser compartilhado nos Stories, como o do Match.

---

### 16. Cinematic DNA: perfil de gosto compartilhável
`backend` `app` `design` · **Size:** L · **Priority:** Medium · **Bloco:** Features · **Iteration:** 2 · **Bloqueado por:** — · **Bloqueia:** —

**Contexto.** O "perfil de gosto" da pessoa (gêneros, décadas, diretores, ritmo), numa arte para compartilhar. Parte
dos dados já existe em `.../modules/stats/` (`GetUserStatsUseCase`) e no grafo do `match`.

**O que fazer:** endpoint `GET /api/v1/users/{u}/dna` (novo caso de uso em `stats`), tela no perfil e uma arte para os
Stories (reaproveitar `EntryStoryCard` e o `storyShare.ts`).

**DoD:**
- [ ] A tela mostra o DNA com pelo menos 10 registros; com menos, um convite para registrar mais.
- [ ] A arte compartilhável respeita o perfil privado (só a própria pessoa compartilha).

---

### 17. Cinematic Wrapped: retrospectiva do ano
`backend` `app` `design` · **Size:** L · **Priority:** Low · **Bloco:** Features · **Iteration:** — · **Bloqueado por:** — · **Bloqueia:** —

**Contexto.** A retrospectiva do ano em Stories. Só faz sentido com um ano de dados: mirar o primeiro dezembro com usuários.

**O que fazer:** endpoint `GET /api/v1/me/wrapped/{ano}` (em `stats`), Story com slides (reaproveitar o player do
Match: `features/match/application/useStoryPlayer.ts`) e uma arte por slide para compartilhar.

**DoD:**
- [ ] Os números batem com o diário do ano (teste de integração com um ano montado).
- [ ] Disponível a partir de 1º de dezembro, com aviso no sino.

---

### 18. Recomendar títulos conversando, com IA
`backend` `app` · **Size:** L · **Priority:** Low · **Bloco:** Features · **Iteration:** 3 · **Bloqueado por:** — · **Bloqueia:** —

**Contexto.** Pedir recomendação conversando ("quero algo leve para hoje, com a Ana"), usando o gosto da pessoa
(diário, grafo) e o catálogo.

**O que fazer:** novo módulo no backend que chama um modelo de linguagem com o contexto do gosto e devolve títulos do
catálogo (nunca inventados: sempre validados no TMDB); tela de conversa no app. Custo por pedido e limite diário por usuário.

**DoD:**
- [ ] Toda recomendação é um título real do catálogo, com link para a página.
- [ ] Limite de uso por dia e custo monitorado.
- [ ] Nada de dados pessoais enviados além do necessário (sem e-mail, sem nome).

---

### 19. Avisar sobre lançamentos ligados ao gosto da pessoa
`backend` `app` · **Size:** L · **Priority:** Low · **Bloco:** Features · **Iteration:** — · **Bloqueado por:** #11 · **Bloqueia:** —

**Contexto.** "Estreou um filme do diretor que você ama", "saiu a nova temporada da série que você está vendo".

**O que fazer:** tarefa agendada (`@Scheduled`) no backend que cruza lançamentos do TMDB com o diário e o grafo de
cada pessoa e cria avisos no sino (e push, card 11). Preferência em Configurações.

**DoD:**
- [ ] No máximo 1 aviso desses por pessoa por dia.
- [ ] Série em andamento (`WATCHING`) recebe aviso de temporada nova.
- [ ] A pessoa desliga em Configurações.

---

### 20. Importar de outros apps além do Letterboxd
`backend` `app` · **Size:** M · **Priority:** Low · **Bloco:** Features · **Iteration:** 3 · **Bloqueado por:** — · **Bloqueia:** —

Tamanho por provedor.

**Contexto.** Hoje só o Letterboxd (`.../modules/importing/infrastructure/letterboxd/`). Fazer sob demanda (IMDb, Trakt, TV Time).

**O que fazer:** um leitor por provedor ao lado do `letterboxd/`, gerando os mesmos `ImportedItemCommand`
(`.../modules/diary/api/ImportedItemCommand.java`); o resto do fluxo (resumo, confirmar, idempotência) é o mesmo. No app,
escolher o provedor em `features/importing/presentation/screens/ImportScreen.tsx`.

**DoD:**
- [ ] Importar o arquivo do provedor gera o mesmo resumo e é idempotente (reimportar não duplica).
- [ ] Testes com um arquivo de exemplo do provedor.

---

## Bloco 5: Lançamento

### 21. Permitir excluir a conta pelo app
`app` `backend` · **Size:** M · **Priority:** High · **Bloco:** Lançamento · **Iteration:** 1 · **Bloqueado por:** — · **Bloqueia:** #26

**Obrigatório para a App Store.**

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

### 22. Adequar o app à LGPD (termos, política, exportar dados)
`produto` `backend` `app` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** 2 · **Bloqueado por:** — · **Bloqueia:** #26

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

### 23. Criar o ambiente de homologação e as variáveis de build
`infra` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** 2 · **Bloqueado por:** — · **Bloqueia:** #24, #26

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

### 24. Automatizar deploy da API e builds do app (CD)
`infra` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** — · **Bloqueado por:** #1, #8, #23 · **Bloqueia:** —

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

### 25. Monitorar erros e disponibilidade em produção
`infra` `backend` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** 2 · **Bloqueado por:** — · **Bloqueia:** —

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

### 26. Rodar o beta fechado (TestFlight e Play)
`produto` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** — · **Bloqueado por:** #21, #22, #23 · **Bloqueia:** #27

**O que fazer:** grupo de teste no TestFlight (até 10 mil pessoas por link) e no teste interno da Play Console; um
jeito fácil de mandar feedback (link em Configurações, ou o feedback do próprio TestFlight); acompanhar crashes e
eventos no PostHog.

**DoD:**
- [ ] Pelo menos 10 pessoas usando por 2 semanas.
- [ ] Feedbacks viram cards neste Project.
- [ ] Os crashes críticos estão corrigidos antes do card 27.

---

### 27. Publicar na App Store e na Play Store
`produto` `design` · **Size:** M · **Priority:** Medium · **Bloco:** Lançamento · **Iteration:** — · **Bloqueado por:** #26 · **Bloqueia:** —

**O que fazer:** prints (iPhone e Android), textos das lojas em PT e EN, ícone final, classificação etária, URL da
política de privacidade, as respostas de "privacidade do app" da Apple (quais dados coletamos) e o envio para revisão.

**DoD:**
- [ ] Aprovado na App Store e na Play Store.
- [ ] Os textos e prints refletem o app atual.

---

## Bloco 6: Futuro

### 28. Monetização: Premium e anúncios
`produto` `backend` `app` · **Size:** XL · **Priority:** Low · **Bloco:** Futuro · **Iteration:** — · **Bloqueado por:** — · **Bloqueia:** —

**Issue grande, com sub-issues.** Só depois de comprovar retenção (ver `docs/Mvp Inicial.md`, seção "Fora do MVP").

**Sub-issues:**

| # | Título | Labels | Size | Bloqueado por |
| --- | --- | --- | --- | --- |
| 28.1 | Definir o que é Premium e os limites do plano grátis | `produto` | S | — |
| 28.2 | Integrar as assinaturas com o RevenueCat | `app` `backend` | L | 28.1, #9 |
| 28.3 | Aplicar o plano da pessoa no backend | `backend` | M | 28.2 |
| 28.4 | Criar a tela de assinatura e mostrar os limites | `app` `design` | M | 28.1, 28.2 |
| 28.5 | Mostrar anúncios só no plano grátis | `app` | M | 28.3 |

**DoD geral:**
- [ ] Todas as sub-issues fechadas.
- [ ] Assinar, cancelar e restaurar compra funcionam no iOS e no Android (sandbox das lojas).

#### 28.1 Definir o que é Premium e os limites do plano grátis
`produto` · **Size:** S · **Bloqueado por:** —

O que o Premium libera (ex.: estatísticas completas, Blend com mais pessoas, sem anúncios), preço por mês e por ano, e
os limites do grátis. Registrar a decisão num ADR em `docs/architecture/`.

#### 28.2 Integrar as assinaturas com o RevenueCat
`app` `backend` · **Size:** L · **Bloqueado por:** 28.1, #9

Produtos criados na App Store e na Play Store, configurados no RevenueCat; SDK `react-native-purchases` no app
(precisa de development build); webhook do RevenueCat no backend para saber quem assinou.

#### 28.3 Aplicar o plano da pessoa no backend
`backend` · **Size:** M · **Bloqueado por:** 28.2

Campo de plano no usuário (atualizado pelo webhook) e os limites aplicados nos casos de uso, com um erro claro quando a
pessoa passa do limite.

#### 28.4 Criar a tela de assinatura e mostrar os limites
`app` `design` · **Size:** M · **Bloqueado por:** 28.1, 28.2

A tela de assinatura (paywall), o aviso quando a pessoa chega num limite e o plano em Configurações.

#### 28.5 Mostrar anúncios só no plano grátis
`app` · **Size:** M · **Bloqueado por:** 28.3

Anúncios em pontos discretos (ex.: entre itens do feed), nunca no meio de um registro; somem para quem é Premium.

### 29. Criar a versão Web
`produto` · **Size:** XL · **Priority:** Low · **Bloco:** Futuro · **Iteration:** — · **Bloqueado por:** — · **Bloqueia:** —

Épico: quebrar em sub-issues quando for a hora.

Perfis, diário, reviews, listas e feed na web, reaproveitando a API (contrato em `docs/architecture/openapi-v1.yaml`).
Quebrar em cards quando for a hora.

---

## Planejamento por iteração
| Iteration | Cards |
| --- | --- |
| **1** (16 a 29 nov) | #2 → #1, #3, #4, #5, #7, #12, #13, #14, #21 |
| **2** (30 nov a 13 dez) | #8 → #9 → #6, #10 e #11 · #16, #22, #23, #25 |
| **3** (14 a 27 dez) | #18, #20 |
| **Backlog** | #15, #17, #19, #24, #26, #27, #28, #29 |

Sobrou tempo na iteração? Puxe o próximo card da seguinte, em vez de planejar demais.
