# cinediary-backend

API do CineDiary: um **monólito modular** em Java 25 + Spring Boot, organizado em módulos com Clean
Architecture e fronteiras verificadas nos testes.

> Voltar para o [README principal](../README.md). Só vai mexer no app? Você não precisa de nada daqui além do
> [`.env`](#variáveis-de-ambiente-env): o `make dev` da raiz roda esta API em Docker.

## Sumário

- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Módulos](#módulos)
- ["Quero mudar X, onde mexo?"](#quero-mudar-x-onde-mexo)
- [Banco de dados e migrações](#banco-de-dados-e-migrações)
- [Testes](#testes)
- [Variáveis de ambiente (.env)](#variáveis-de-ambiente-env)
- [Taste Match: eventos → Neo4j + GDS](#taste-match-eventos--neo4j--gds)
- [Decisões de implementação](#decisões-de-implementação)

---

## Tecnologias

| Tecnologia | Versão | Para quê |
| --- | --- | --- |
| Java | 25 | Linguagem (o Gradle acha o JDK pela *toolchain*) |
| Spring Boot | 4.1 | Web (MVC), segurança, validação, actuator |
| Spring Modulith | 2.1 | Fronteiras entre módulos + **Outbox** de eventos (`event_publication`) |
| Spring Security (Resource Server) | — | Valida o JWT do Clerk localmente (JWKS) |
| Spring Data JPA + JdbcClient | — | Persistência (JPA nas entidades; SQL direto onde é mais simples) |
| PostgreSQL | 17 | Banco principal |
| Flyway | — | Migrações do banco (`src/main/resources/db/migration`) |
| Neo4j + Graph Data Science | 5.26 | Grafo de gosto do Taste Match |
| Svix (SDK) | 2.10 | Verifica a assinatura do webhook do Clerk |
| springdoc-openapi | 3.2 | Swagger UI em `/swagger-ui.html` |
| Lombok | — | Menos boilerplate (`@RequiredArgsConstructor`…) |
| Gradle (Kotlin DSL) | 9.8 | Build (`./gradlew`, já vem no repositório) |
| JUnit 5 + Testcontainers + ArchUnit | — | Testes de integração com PostgreSQL e Neo4j reais + regras de arquitetura |

Serviços externos: **Clerk** (contas e login), **TMDB** (catálogo de filmes e séries) e **Svix Play** (o relay
do webhook do Clerk em desenvolvimento).

---

## Como rodar

**Pré-requisitos:** Docker e o [`.env` preenchido](#variáveis-de-ambiente-env). Para o modo dev, também o
JDK 25.

### Só preciso da API rodando (para mexer no app)
Na **raiz** do projeto: `make dev` ou `make back` (ou `npm run dev` / `npm run back`). Eles sobem a API
**empacotada em Docker** (o [`Dockerfile`](Dockerfile) daqui, no perfil `app` do `docker-compose.yml`). Veja o
[README principal](../README.md#rodando-no-dia-a-dia).

### Vou desenvolver o backend (modo dev)
Aqui em `cinediary-backend/`:

| Comando | O que faz |
| --- | --- |
| `make run` | Sobe PostgreSQL + Neo4j e roda a API em modo dev em `http://localhost:8080` |
| `make test` | Todos os testes (ArchUnit + integração com Testcontainers; precisa do Docker) |
| `make build` | Compila e gera o jar (sem testes) |
| `make up` / `make down` | Sobe / para só o PostgreSQL e o Neo4j |
| `make logs` | Logs do PostgreSQL e do Neo4j |
| `make psql` | Abre o `psql` no banco local |
| `make db-ui` | Abre o **pgweb** (interface web das tabelas) em `http://localhost:8082` |
| `make cypher` | Abre o `cypher-shell` no Neo4j (Browser em `http://localhost:7474`) |
| `make clean` | Limpa o build |
| `make reset-db` | ⚠️ **Apaga** os dados do PostgreSQL e do Neo4j e sobe de novo |

Sem `make` (Windows sem WSL), use os comandos equivalentes:
- `docker compose up -d --wait` sobe o banco;
- `gradlew.bat bootRun` (ou `./gradlew bootRun`) roda a API;
- `gradlew.bat test` roda os testes.

Com a API em modo dev aberta, o `make dev` / `make back` da raiz percebem que já existe uma API na 8080 e
usam essa, sem subir outra.

**Endereços úteis:**
- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui.html`
- Health: `http://localhost:8080/actuator/health`
- pgweb: `http://localhost:8082`
- Neo4j Browser: `http://localhost:7474`

---

## Fluxo de trabalho

### O dia a dia
1. **Suba em modo dev:** `make run`. A API sobe com o código atual. Para ver uma mudança, pare (`Ctrl+C`) e rode
   de novo; pela IDE, use o *Run* ou o *Debug* da `CineDiaryApplication`.
2. **Quer o app junto?** Na raiz, rode `make front`. Ele usa a sua API em modo dev, porque ela já está na 8080.
   O webhook do Clerk só chega com o Svix ligado; para ele, rode `make back` na raiz noutro terminal, que também
   percebe a API já rodando e só liga o Svix.
3. **Teste as rotas:**
   - **Pelo app:** o jeito mais simples.
   - **Pelo Swagger** (`/swagger-ui.html`): as rotas protegidas precisam do token do Clerk em **Authorize**.
   - **Pelos testes de integração:** eles simulam o login (`jwt()` do Spring Security Test) e são o jeito mais
     confiável de exercitar uma regra. Veja os exemplos em `src/test/.../modules/<módulo>/`.
4. **Veja o banco:** `make db-ui` (pgweb, sem login) ou `make psql`.
5. **Antes de terminar:** `make test`. Ele inclui o `ArchitectureFitnessTest`, que reprova importações entre
   módulos e camadas fora da regra.

### Uma feature de ponta a ponta
Exemplo: "mostrar quantas pessoas querem ver um título".

1. **Banco:** se precisar, uma migração **nova** `V<próximo>__descricao.sql` em `src/main/resources/db/migration/`.
2. **Domínio:** o modelo e a regra em `domain/`, e a interface (`*Port`) que o caso de uso vai chamar.
3. **Infraestrutura:** o `*Adapter` em `infrastructure/persistence/` implementa o `Port` (SQL com `JdbcClient` ou
   Spring Data).
4. **Caso de uso:** um `*UseCase` em `application/` (`@Service`, `@Transactional`). Se precisar de dados de outro
   módulo, use o `*ModulePort` do `api/` dele (nunca o `domain` ou o `application` de outro módulo).
5. **HTTP:** a rota no `*Controller` de `presentation/` e o DTO de resposta em `presentation/dto/`.
6. **Contrato:** descreva a rota e o formato em `docs/architecture/openapi-v1.yaml`.
7. **App:** em `cinediary-mobile/`, rode `npm run api:types` (regera os tipos a partir do contrato) e siga o
   ["Quero mudar X"](../cinediary-mobile/README.md#quero-mudar-x-onde-mexo) do app: chamada em `infrastructure/`,
   hook em `application/` e tela.
8. **Testes:** um teste de integração em `src/test/.../modules/<módulo>/` cobrindo o caminho feliz e as regras
   (privacidade, permissões).
9. **Analytics:** se a feature tiver eventos, entram na tabela do ADR e no `events.ts` do app.

### Depurar
| Quero ver… | Como |
| --- | --- |
| As tabelas e os dados | `make db-ui` → `http://localhost:8082` (ou `make psql`) |
| Os logs da API | O terminal do `make run`. Com a API em Docker, `make logs-api` na raiz |
| Se o webhook do Clerk chegou | O terminal do `make back` (ou `.dev-logs/svix.log`), o painel do Svix Play e a tabela `webhook_events` |
| Eventos do Outbox que falharam | A tabela `event_publication`: as linhas sem `completion_date` ainda vão ser reenviadas a cada 30 s |
| O grafo do Taste Match | `make cypher` ou o Neo4j Browser em `http://localhost:7474` |
| Por que um teste falhou | `build/reports/tests/test/index.html` |
| Os detalhes de um título do TMDB guardados | A tabela `catalog_titles` (e `catalog_title_translations` para o inglês); `details_synced_at` vazio = busca de novo na próxima abertura |

---

## Estrutura de pastas

```text
cinediary-backend/
├── Dockerfile                 # API empacotada (usada pelo make dev da raiz)
├── docker-compose.yml         # postgres, db-ui (pgweb), neo4j e api (perfil "app")
├── Makefile                   # comandos do backend (make help)
├── build.gradle.kts           # dependências e versão do Java
├── .env.example               # modelo do .env (copie e preencha)
└── src/
    ├── main/
    │   ├── java/com/cinediary/api/
    │   │   ├── CineDiaryApplication.java
    │   │   ├── shared/        # o que todos os módulos usam (ver abaixo)
    │   │   └── modules/       # um pacote por módulo de negócio
    │   │       └── users/ catalog/ diary/ importing/ social/ stats/ match/
    │   └── resources/
    │       ├── application.yml          # configuração (lê as variáveis do .env)
    │       └── db/migration/V*.sql       # migrações do Flyway
    └── test/java/com/cinediary/api/
        ├── IntegrationTest.java         # base dos testes: sobe PostgreSQL e Neo4j (Testcontainers)
        ├── FakeTmdb.java, TestTitles.java
        ├── architecture/                # ArchitectureFitnessTest (Modulith + ArchUnit)
        ├── shared/                      # testes de CORS
        └── modules/<módulo>/            # testes de integração de cada módulo
```

### `shared/`: o que é de todos

| Pasta | O que tem |
| --- | --- |
| `shared/domain/` | Exceções do domínio (`NotFoundException`, `ForbiddenException`…), `CurrentUser`, `ContentLanguage` (idioma pedido pelo app), `ReplyPolicy` |
| `shared/application/` | `CurrentUserProviderPort` |
| `shared/infrastructure/config/` | `SecurityConfig` (JWT do Clerk, rotas públicas), `CorsConfig`, `Neo4jConfig`, `AsyncConfig`, `OpenApiConfig`, `ModulithEventRetryScheduler` (reenvio de eventos) |
| `shared/infrastructure/web/` | `ApiExceptionHandler` (exceção → status HTTP), `ContentLanguageFilter` (lê o `Accept-Language`), `CurrentUserArgumentResolver` (JWT → `CurrentUser` nos controllers) |

### Dentro de cada módulo

Todo módulo tem a mesma forma. Um exemplo com o `social`:

```text
modules/social/
├── package-info.java      # @ApplicationModule: marca o pacote como módulo
├── api/                   # A ÚNICA parte que outros módulos podem importar
│   ├── SocialModulePort.java     # o que o módulo oferece aos outros
│   └── FollowCreatedEvent.java   # eventos que ele publica
├── domain/                # Java puro (sem Spring): modelos, regras e "Ports" (interfaces)
│   ├── Follow.java, FollowPolicy.java, Relationship.java
│   └── FollowRepositoryPort.java # interface que a infrastructure implementa
├── application/           # casos de uso (@Service, @Transactional)
│   ├── FollowUseCase.java, GetFeedUseCase.java, GetTitleCommunityUseCase.java…
│   └── SocialModuleFacade.java   # implementa o SocialModulePort
├── infrastructure/        # detalhes técnicos: banco, APIs externas
│   └── persistence/              # *Adapter (implementa os Ports), *JpaEntity, SpringData*Repository
└── presentation/          # HTTP
    ├── SocialController.java, FeedController.java…
    └── dto/                      # *Request / *Response (o formato do contrato OpenAPI)
```

Onde cada módulo fala com o mundo de fora, em `infrastructure/`:
- `catalog/infrastructure/tmdb/`: chamadas ao TMDB;
- `users/infrastructure/clerk/`: webhook e dados do Clerk;
- `importing/infrastructure/letterboxd/`: leitura do ZIP e dos CSVs do Letterboxd;
- `match/infrastructure/neo4j/` e `match/infrastructure/fallback/`: os dois motores do Taste Match.

**O caminho de uma requisição:**
1. O `Controller` recebe o pedido.
2. Ele chama um `UseCase`.
3. O `UseCase` usa as regras do `domain`.
4. Os dados saem por um `Port`, que um `Adapter` da `infrastructure` implementa.
5. O `UseCase` devolve um modelo, que o `Controller` converte num DTO.

**Regras** (o build falha se alguma for quebrada, pelo `ArchitectureFitnessTest`):
- **Spring Modulith:** outro módulo só pode importar o pacote `api`, e não pode haver ciclos.
- **ArchUnit:**
  - `domain` não usa frameworks;
  - as camadas só dependem na direção certa;
  - entidades JPA ficam só em `infrastructure`, e controllers só em `presentation`;
  - `shared` não depende de módulos.
- **Ciclos quebrados com portas invertidas:**
  - `catalog.api.ViewerTitleStatePort` é implementada pelo `diary`;
  - `users.api.PendingInviteAcceptor` é implementada pelo `match`.

---

## Módulos

| Módulo | Depende de | Responsabilidade | Rotas principais (`/api/v1`) |
| --- | --- | --- | --- |
| `users` | catalog, diary | Conta, perfil (bio, pronomes, privado), onboarding, sincronização com o Clerk (webhook + criação no primeiro login), username disponível | `GET/PATCH /me`, `POST /me/onboarding`, `POST /webhooks/clerk`, `GET /public/usernames/{u}/availability` |
| `catalog` | — | TMDB (busca, detalhe, elenco, extras, temporadas, pessoa, produtora) com cache no banco (7 dias), idioma do app, nota do TMDB | `/catalog/search`, `/catalog/popular`, `/catalog/trending`, `/catalog/{mediaType}/{tmdbId}`, `/credits`, `/extras`, `/people/{id}`, `/companies/{id}` |
| `diary` | catalog | Registros (com data, nota, review, spoiler, rever), estado por título (assistido, curtido, watchlist, favorito), progresso de séries | `PUT /titles/{id}/state`, `GET/POST/PUT/DELETE /diary/entries`, `GET /watchlist`, `PUT /series/{id}/episodes` |
| `importing` | catalog, diary | Importação do Letterboxd: ZIP de até 20 MB, conferido em paralelo, com um resumo antes de confirmar; idempotente | `POST /imports/letterboxd`, `GET /imports/{id}`, `POST /imports/{id}/confirm` |
| `social` | catalog, diary, users | Seguir (e pedidos para perfil privado), perfis públicos, busca de pessoas, feed, sino (avisos + atividade dos amigos), curtidas e respostas, página social do título (nota consolidada, amigos, reviews) | `/users/{u}`, `/users/{u}/follow`, `/people/search`, `/feed`, `/activity`, `/me/notifications`, `/entries/{id}/like`, `/entries/{id}/comments`, `/titles/{id}/community`, `/titles/{id}/reviews` |
| `stats` | catalog, social, users | Estatísticas do perfil (totais, média, top gêneros, filmes por mês) | `GET /users/{u}/stats` |
| `match` | catalog, diary, importing, users | Taste Match: convite, cálculo no Neo4j (com plano B no PostgreSQL), Story, watchlist compartilhada, recomendações | `/matches`, `/matches/{code}/accept`, `/matches/{id}/story`, `/matches/{id}/watchlist`, `/recommendations/*` |

A lista completa de rotas e formatos está no Swagger (`/swagger-ui.html`) e no contrato
[`docs/architecture/openapi-v1.yaml`](../docs/architecture/openapi-v1.yaml).

### Arquivos principais por módulo

Os casos de uso (`application/`) e onde os dados entram e saem (`infrastructure/`):

| Módulo | Casos de uso e listeners | Infraestrutura |
| --- | --- | --- |
| `users` | `ResolveCurrentUserUseCase` (cria o usuário no primeiro login), `GetCurrentUserUseCase`, `UpdateUserProfileUseCase`, `CompleteOnboardingUseCase`, `CheckUsernameAvailabilityUseCase`, `SyncClerkUserUseCase` (webhook) | `UserRepositoryAdapter`, `clerk/WebhookVerifierService` (assinatura do Svix), `ProcessedWebhookAdapter` (idempotência) |
| `catalog` | `SearchCatalogUseCase`, `GetCatalogTitleDetailUseCase`, `GetTitleCreditsUseCase`, `GetTitleExtrasUseCase`, `GetSeasonUseCase`, `GetPopularTitlesUseCase`, `GetTrendingTitlesUseCase`, `GetShowcaseUseCase`, `GetPersonUseCase`, `GetCompanyUseCase`, `GetGenresUseCase`; `CatalogCachingService` (cache de 7 dias) | `tmdb/TmdbHttpClient`, `persistence/CatalogRepositoryAdapter` |
| `diary` | `CreateDiaryEntryUseCase`, `ManageDiaryEntryUseCase` (editar e excluir), `ListDiaryEntriesUseCase`, `ListUndatedWatchedUseCase`, `UpdateTitleStateUseCase` (assistido, curtir, watchlist), `UpdateSeriesEpisodesUseCase`, `ListWatchlistUseCase` | `DiaryRepositoryAdapter` |
| `importing` | `StartLetterboxdImportUseCase`, `GetImportJobUseCase`, `ConfirmImportJobUseCase` | `letterboxd/` (ZIP e CSVs), `ImportJobRepositoryAdapter` |
| `social` | `FollowUseCase`, `GetPublicProfileUseCase`, `ListPeopleUseCase`, `GetPersonDiaryUseCase`, `GetFeedUseCase`, `GetFriendsActivityUseCase`, `NotificationsUseCase`, `EntryInteractionsUseCase` (curtidas e respostas), `GetTitleCommunityUseCase`; `SocialEventListener`, `WatchlistActivityListener` | `FollowRepositoryAdapter`, `NotificationsAdapter`, `ActivityAdapter`, `EntryInteractionsAdapter` |
| `stats` | `GetUserStatsUseCase` | `StatsSqlQueryAdapter` |
| `match` | `CreateTasteMatchUseCase`, `AcceptTasteMatchUseCase`, `ListUserMatchesUseCase`, `GetMatchStoryUseCase`, `ManageSharedWatchlistUseCase`, `LeaveTasteMatchUseCase`, `RecalculateActiveMatchesUseCase`, `GetRecommendationsUseCase`; `TasteGraphModulithEventListener` | `neo4j/Neo4jTasteGraphProjector`, `neo4j/Neo4jGdsTasteMatchEngineAdapter`, `fallback/RelationalTasteMatchEngineAdapter`, `MatchRepositoryAdapter` |

Cada módulo também tem o `*ModuleFacade`, que implementa o `*ModulePort` do `api/`: é a porta de entrada
para os outros módulos.

---

## "Quero mudar X, onde mexo?"

| Quero… | Onde |
| --- | --- |
| Criar uma rota nova | `presentation/*Controller.java` do módulo + DTO em `presentation/dto/` → um `UseCase` em `application/`. **Depois atualize o [`openapi-v1.yaml`](../docs/architecture/openapi-v1.yaml)** e rode `npm run api:types` no app |
| Mudar uma regra de negócio | `domain/` (regra pura) ou o `UseCase` em `application/` |
| Mudar uma consulta ao banco | `infrastructure/persistence/*Adapter.java` ou `SpringData*Repository.java` |
| Mudar a estrutura do banco | **Nova** migração `V<próximo>__descricao.sql` em `src/main/resources/db/migration/` (nunca edite uma que já rodou) |
| Um módulo precisar de dados de outro | Adicione um método no `*ModulePort` do `api/` do módulo dono (e implemente no `*ModuleFacade`). Nunca importe `domain`/`application` de outro módulo |
| Reagir ao que acontece em outro módulo | O dono publica um `*Event` (em `api/`); quem reage cria um listener (`@ApplicationModuleListener` = assíncrono pelo Outbox; `@EventListener` = na mesma transação) |
| Mudar a chamada ao TMDB | `catalog/infrastructure/tmdb/TmdbHttpClient.java` |
| Mudar o que o webhook do Clerk faz | `users/application/SyncClerkUserUseCase.java` (rota em `users/presentation/WebhookController.java`) |
| Mudar como o usuário é criado no primeiro login | `users/application/ResolveCurrentUserUseCase.java` |
| Mudar rotas públicas, CORS ou validação do JWT | `shared/infrastructure/config/SecurityConfig.java` / `CorsConfig.java` |
| Mudar o status HTTP de um erro | `shared/infrastructure/web/ApiExceptionHandler.java` |
| Mudar o cálculo do Taste Match | `match/domain/TasteSimilarityCalculator.java` (fórmula) e `match/infrastructure/neo4j/` (consultas no grafo) |
| Mudar a importação do Letterboxd | `importing/infrastructure/letterboxd/` (leitura do ZIP/CSV) e `importing/application/` |
| Uma configuração nova | `application.yml` lendo `${MINHA_VAR:padrão}` + adicione no `.env.example` |

---

## Banco de dados e migrações

As migrações do Flyway rodam sozinhas quando a API sobe, na ordem do número:

| Migração | O que criou |
| --- | --- |
| `V1` | Esquema inicial: usuários, catálogo, diário, estado por título, episódios, importação, match |
| `V2` | Sincronização de detalhes do catálogo (TTL) |
| `V3` | Sincronização com o Clerk e exclusão lógica (soft delete) |
| `V4` | Outbox do Spring Modulith (`event_publication`) e Match v2 |
| `V5` | Fim do Match e escolhas do Story |
| `V6` | Remove os avatares genéricos do Clerk |
| `V7` | Registros de temporada e episódio |
| `V8` | Spoiler nas reviews |
| `V9` | Traduções do catálogo (pt/en) |
| `V10` | Seguir (`follows`) |
| `V11` | Bio, pronomes e preferências do perfil |
| `V12` | Curtidas e respostas em registros |
| `V13` | Quem pode responder (`reply_policy`) |
| `V14` | Sino (`notifications`) |
| `V15` | Atividade dos amigos (`activities`) |
| `V16` | Atividade de watchlist ("quer ver") |
| `V17` | Nota do TMDB e índices da página do título |

Para ver as tabelas: `make db-ui` (pgweb, sem login) ou `make psql`.

---

## Testes

```bash
make test         # ou: ./gradlew test
```

- **Integração:** os testes sobem **PostgreSQL e Neo4j reais** com o Testcontainers (precisa do Docker
  aberto), e o TMDB é simulado (`FakeTmdb`).
- **Arquitetura:** o `ArchitectureFitnessTest` falha o build se as regras de módulos ou de camadas forem
  quebradas.
- **Um teste só:** `./gradlew test --tests '*TitleCommunity*'`.
- **Resultados:** ficam em `build/test-results/test/` (XML) e `build/reports/tests/test/index.html`.

### OrbStack e Colima

O Testcontainers procura o Docker em `/var/run/docker.sock`. Com o **OrbStack** ou o **Colima**, esse arquivo
pode não existir, e todos os testes falham com `Could not find a valid Docker environment`.

O `make test` já resolve isso: se `DOCKER_HOST` estiver vazio, ele usa o socket do contexto ativo do Docker
(`docker context inspect`) e mostra qual escolheu (`Docker: unix://...`). Se esse socket for do OrbStack ou
do Colima, ele também define `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`, o caminho do socket
**dentro** da VM, que o Testcontainers monta no container de limpeza (Ryuk). Com o Docker Desktop ou o Docker
rootless (`/run/user/<uid>/docker.sock`), o socket do host é usado como está.

- **Confira o contexto ativo:** `docker context ls` (o marcado com `*`). Ele deve ser `orbstack` ou `colima`.
- **Rodando o Gradle direto** (`./gradlew test` ou pela IDE), a detecção não acontece. Exporte as variáveis:

  ```bash
  export DOCKER_HOST=$(docker context inspect --format '{{.Endpoints.docker.Host}}')
  export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
  ```

  Na **IDE**, os exports de outro terminal não chegam: defina as duas variáveis nas variáveis de ambiente da
  configuração de execução dos testes, ou abra a IDE por um terminal que já tenha feito os exports.
- **Colima com `--network-address`:** os containers ficam num IP próprio da VM. Exporte também o endereço
  do perfil ativo (troque `default` pelo perfil, se o contexto for `colima-<perfil>`):
  `TESTCONTAINERS_HOST_OVERRIDE=$(colima ls -j | jq -r 'select(.name == "default") | .address')`.
- **Um teste só pelo make:** `make test ARGS="--tests '*TitleCommunity*'"`.

---

## Variáveis de ambiente (`.env`)

```bash
cp .env.example .env        # Windows sem WSL: copy .env.example .env
```

O `.env` **nunca vai para o git** (está no `.gitignore`). Ele é lido pelo `make run`, pelo `docker compose`
e pelo `make dev` da raiz, que confere as obrigatórias antes de subir.

### Resumo

| Variável | Obrigatória? | De onde vem |
| --- | --- | --- |
| `CLERK_ISSUER` | ✅ | Painel do Clerk (já configurado) → API keys → Frontend API URL |
| `CLERK_WEBHOOK_SECRET` | ✅ (a API não sobe sem) | Painel do Clerk (já configurado) → Developers → Webhooks → o endpoint do Svix Play → Signing Secret (no fim da página) |
| `TMDB_API_TOKEN` | ✅ | TMDB → avatar → API → Token de Leitura da API |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Não (já vêm prontas) | Banco local do `docker-compose.yml` |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Não (padrões do compose) | Neo4j local |
| `CLERK_AUTHORIZED_PARTIES` | Não | Origens aceitas no claim `azp` (vazio = não confere) |
| `CORS_ALLOWED_ORIGINS` | Não | Só para o Expo web no navegador |
| `INVITE_BASE_URL` | Não | Link do convite do Match (padrão `cinediary://match/invite/`) |
| `PORT` | Não | Porta da API (padrão 8080) |

> [!NOTE]
> **O Clerk já está configurado** (login, campos do token e webhook) e o time todo usa **o mesmo painel**.
> Você não configura nada lá: só copia dois valores para o seu `.env`. Para entrar no painel, peça a quem
> administra para te convidar na aplicação **CineDiary** do Clerk.

### 1. Clerk: `CLERK_ISSUER` e `CLERK_WEBHOOK_SECRET`

O Clerk cuida das contas e do login. A API usa:
- **`CLERK_ISSUER`:** para conferir os tokens que o app manda;
- **`CLERK_WEBHOOK_SECRET`:** para conferir a assinatura do webhook que avisa quando alguém cria a conta, muda
  nome ou foto, ou exclui a conta.

1. Entre em [dashboard.clerk.com](https://dashboard.clerk.com) e abra a aplicação **CineDiary**.
2. **`CLERK_ISSUER`:** vá em **Configure → API keys**.
   - Copie a **Frontend API URL**, no formato `https://<algo>.clerk.accounts.dev`. Se ela não aparecer, abra
     **Show API URLs**.

<details open>
<summary>Prints: <code>CLERK_ISSUER</code></summary>

   **1.** Abra a aba Configure  
   <img src="../docs/images/setup/back/clerk_backend_issuer/passo%201.png" width="520" alt="Abra a aba Configure">

   **2.** No menu, API keys  
   <img src="../docs/images/setup/back/clerk_backend_issuer/passo%202.png" width="640" alt="No menu, API keys">

   **3.** Copie a Frontend API URL  
   <img src="../docs/images/setup/back/clerk_backend_issuer/passo%203.png" width="640" alt="Copie a Frontend API URL">

</details>

3. **`CLERK_WEBHOOK_SECRET`:** vá em **Configure → Developers → Webhooks** e abra o endpoint que **já
   existe**, o do Svix Play (`https://play.svix.com/in/…`).
   - Role a página até o fim, em **Signing Secret**, clique para mostrar e copie. Começa com `whsec_`.
   - **Não crie um endpoint novo:** todo mundo usa esse, e o `make dev` / `make back` já liga o `svix listen` que
     traz os eventos para a sua API local.

<details open>
<summary>Prints: <code>CLERK_WEBHOOK_SECRET</code></summary>

   **1.** Abra a aba Configure  
   <img src="../docs/images/setup/back/clerk_webhook_secrets/passo%201.png" width="520" alt="Abra a aba Configure">

   **2.** No menu, Developers → Webhooks  
   <img src="../docs/images/setup/back/clerk_webhook_secrets/passo%202.png" width="640" alt="No menu, Developers → Webhooks">

   **3.** Abra o endpoint que já existe (o do Svix Play)  
   <img src="../docs/images/setup/back/clerk_webhook_secrets/passo%203.png" width="640" alt="Abra o endpoint que já existe (o do Svix Play)">

   **4.** No fim da página, Signing Secret: clique no olho e copie  
   <img src="../docs/images/setup/back/clerk_webhook_secrets/passo%204.png" width="640" alt="No fim da página, Signing Secret: clique no olho e copie">

</details>

4. Cole os dois no `.env`:
   ```env
   CLERK_ISSUER=https://<algo>.clerk.accounts.dev
   CLERK_WEBHOOK_SECRET=whsec_...
   ```
5. **Teste:** com o `make back` rodando, crie uma conta no app. A mensagem do webhook aparece no terminal do
   `make back` (ou em `.dev-logs/svix.log`, se usar o `make dev`).

> [!NOTE]
> A API **não sobe** sem o `CLERK_WEBHOOK_SECRET`, de propósito, para nunca aceitar webhook sem assinatura.
> Se o webhook não chegar (o Svix desligado, por exemplo), nada quebra: a API cria a conta no primeiro login,
> mas com um @ provisório (ex.: `cinefilo_1234`) e sem nome e foto. **Para resolver em desenvolvimento:** no app,
> **Perfil → Editar perfil** e salve o @ certo. Em produção isso não acontece, porque o webhook vai direto para
> a API.

> [!TIP]
> Se duas pessoas rodarem o `make back` ao mesmo tempo, os eventos do webhook podem chegar só na API de uma
> delas. Não é um problema: a conta é criada no primeiro login de qualquer jeito.

<details>
<summary><strong>Configurar um Clerk do zero</strong> (só se um dia precisarem de uma aplicação nova, por exemplo a de produção)</summary>

1. **Criar a aplicação:** [dashboard.clerk.com](https://dashboard.clerk.com) → **Create application** → nome "CineDiary".
2. **Configure → User & authentication:**
   - **Email address:** ligado, obrigatório, verificado por **código** por e-mail;
   - **Username:** ligado e obrigatório (o cadastro do app pede um @);
   - **Password:** ligado.
3. **Configure → Sessions → Customize session token.** Adicione os campos que a API lê do token:
   ```json
   {
     "username": "{{user.username}}",
     "name": "{{user.full_name}}",
     "image_url": "{{user.image_url}}"
   }
   ```
   Sem isso, quem entra antes do webhook chegar fica com um @ provisório (`cinefilo_…`) até ele chegar.
4. **Configure → Native applications:** se o painel pedir, ligue a **Native API** (o app usa o SDK do Clerk
   para Expo).
5. **Webhook:**
   - **Em desenvolvimento:** use um endereço do Svix Play. Abra [play.svix.com](https://play.svix.com), que
     gera um na hora, e troque o `SVIX_PLAY_ID` em `scripts/dev.mjs` pelo código dele. O endpoint no Clerk é
     `https://play.svix.com/in/<SVIX_PLAY_ID>/`.
   - **Em produção:** o endpoint é a URL pública da API (`https://…/api/v1/webhooks/clerk`).
   - Em **Configure → Webhooks → Add Endpoint**, cole a URL, marque `user.created`, `user.updated` e
     `user.deleted`, crie e copie o **Signing Secret**.
6. Pegue a **Frontend API URL** e o **Signing Secret** como no passo a passo acima. A **Publishable key** vai no
   app (veja o [README do app](../cinediary-mobile/README.md#2-expo_public_clerk_publishable_key)).

Os nomes dos menus do Clerk mudam de vez em quando. Se não achar, procure pelo nome da opção na busca do painel.

</details>

### 3. TMDB: `TMDB_API_TOKEN`

Todo o catálogo (busca, pôsteres, elenco, trailer, nota) vem do TMDB.

1. Crie uma conta em [themoviedb.org](https://www.themoviedb.org/signup) e confirme o e-mail.
2. Clique no seu avatar (canto de cima, à direita) → **API**.
3. Se for a primeira vez, peça a chave: tipo **Developer**, aceite os termos e preencha o formulário. Para uso
   pessoal ou de estudo, a aprovação é na hora.
4. Na mesma página, copie o **Token de Leitura da API** (*API Read Access Token*). É o token **longo**, que
   começa com `eyJ…`. Não use a "Chave da API" curta.
5. Cole no `.env`, sem espaço depois do `=`:
   ```env
   TMDB_API_TOKEN=eyJhbGciOi...
   ```

<details open>
<summary>Prints: <code>TMDB_API_TOKEN</code></summary>

   **1.** Avatar (canto de cima, à direita) → API  
   <img src="../docs/images/setup/back/tmdb_api/passo%201.png" width="640" alt="Avatar (canto de cima, à direita) → API">

   **2.** Copie o Token de Leitura da API  
   <img src="../docs/images/setup/back/tmdb_api/passo%202.png" width="640" alt="Copie o Token de Leitura da API">

</details>

### 4. Banco e Neo4j (já vêm prontos)

Os valores do `.env.example` batem com o `docker-compose.yml`, então não precisa mudar nada:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cinediary
DB_USER=cinediary
DB_PASSWORD=cinediary
```

O Neo4j usa `bolt://localhost:7687`, com usuário `neo4j` e senha `cinediary-neo4j`. Mude `NEO4J_*` só se
alterar o compose. Quando a API roda em Docker, o compose já troca `DB_HOST` e `NEO4J_URI` pelos nomes dos
serviços (`postgres`, `neo4j`).

### 5. Opcionais

| Variável | Quando mexer |
| --- | --- |
| `CLERK_AUTHORIZED_PARTIES` | Em produção, para aceitar só tokens emitidos para as origens do app (claim `azp`). Separadas por vírgula |
| `CORS_ALLOWED_ORIGINS` | Só se for usar o app no navegador (Expo web) a partir de outra origem |
| `INVITE_BASE_URL` | Para o link do convite do Match apontar para outro lugar (ex.: um domínio web) |
| `PORT` | Para rodar a API em outra porta (lembre de mudar o `EXPO_PUBLIC_API_URL` do app) |
| `TMDB_BASE_URL` | Raramente: para apontar para outro endereço da API do TMDB |

---

## Taste Match: eventos → Neo4j + GDS

1. **Eventos na mesma transação.** Os casos de uso publicam records imutáveis com `ApplicationEventPublisher`
   dentro do `@Transactional`:
   - `UserSyncedEvent`, `UserDeletedEvent` e `UserOnboardingCompletedEvent` (users);
   - `TitleInteractionUpdatedEvent` (diary);
   - `ImportConfirmedEvent` (importing).

   O Spring Modulith grava cada um em `event_publication` **na mesma transação** (Outbox nativo, migração V4).
2. **Projeção no grafo.** O `TasteGraphModulithEventListener` (match) recebe o evento depois do commit, de forma
   assíncrona e numa transação nova:
   - o `Neo4jTasteGraphProjector` faz `MERGE` de `(:User)-[:INTERACTED]->(:Title)-[:HAS_GENRE]->(:Genre)` e
     `(:User)-[:PREFERS_GENRE]->(:Genre)`, sempre a partir do estado atual, então a ordem dos eventos não importa;
   - os Matches de quem mudou são recalculados.
   - **Neo4j fora do ar:** a publicação fica pendente e o `ModulithEventRetryScheduler` a reenvia a cada 30 s;
     ao subir a API, as pendentes também são reenviadas.
3. **O cálculo** (`Neo4jGdsTasteMatchEngineAdapter`):
   - `gds.similarity.cosine` + proximidade de notas (50%);
   - Jaccard de gêneros (30%);
   - overlap de favoritos (20%).
   - **Modo Descoberta** (menos de 3 títulos avaliados em comum): 65% gêneros + 35% favoritos.
4. **Plano B.** Se o Neo4j falhar, o `RelationalTasteMatchEngineAdapter` aplica **as mesmas fórmulas**
   (`TasteSimilarityCalculator`, domínio puro) sobre o PostgreSQL. Um teste garante que os dois motores chegam
   ao mesmo número.

---

## Decisões de implementação

- **Spring Boot 4.1:** a 3.x saiu do suporte OSS. Usa Jackson 3 e virtual threads.
- **Neo4j pelo driver oficial**, sem Spring Data Neo4j, para evitar um segundo gerenciador de transações junto
  do JPA.
- **Usuário criado no primeiro login (JIT):** o webhook do Clerk é complemento, não requisito.
- **Webhook idempotente** (`webhook_events`), respeita a ordem dos eventos e faz **soft delete**: a conta excluída
  responde 403.
- **Idioma:** o app manda `Accept-Language`, e o catálogo volta em pt-BR ou en-US (traduções na V9).
- **Notificações e atividade são gravadas na hora**, dentro do caso de uso, com índices únicos contra duplicatas.
  O feed é montado na leitura.
- **Estilo:** chaves `{` em linha própria em classes e métodos; comentários e mensagens em português.
