# CineDiary v2.0 — ADRs, Clean Architecture, Neo4j GDS e Eventos PostHog

> **Versão:** 2.0 · **Data:** 13/11/2026  
> **Autor:** Architect Senior  
> **Artefatos Relacionados:** [Clean-Architecture-v2-Blueprint.md](./Clean-Architecture-v2-Blueprint.md) · [openapi-v1.yaml](./openapi-v1.yaml) · [schema-and-queries-mvp.sql](./schema-and-queries-mvp.sql)

---

## 1. Architecture Decision Records (ADRs v2.0)

### ADR-01 (Revisado v2.0) · Clean Architecture Estrita por Contexto Delimitado (Bounded Context)
- **Contexto:** Na primeira iteração da Fase 2, o código do backend ficou com pacotes planos (`com.cinediary.api.catalog.*`) misturando Controllers, Services, Entidades JPA e clientes externos, além de acoplamento direto entre `catalog` e os repositórios internos de `diary`. No mobile, hooks de API e telas estavam espalhados entre `src/core/`, `src/components/` e `src/features/`.
- **Decisão:**
  - **Backend (`cinediary-backend`):** Cada módulo (`users`, `catalog`, `diary`, `importing`, `stats`, `match`) reside em `com.cinediary.api.modules.<modulo>` e é estritamente dividido em 5 subpacotes:
    1. `domain`: Modelos de domínio puros, Value Objects e interfaces de saída (*Ports*). Proibido importar JPA, Spring Web ou clientes HTTP.
    2. `application`: Casos de uso (`*UseCase`), comandos/queries e implementação da Facade do módulo.
    3. `infrastructure`: Entidades JPA (`*JpaEntity`), repositórios Spring Data, adaptadores Neo4j GDS e clientes HTTP (`TmdbHttpClient`, `Svix`).
    4. `presentation`: Controllers REST e DTOs de entrada/saída.
    5. `api`: Port público (`*ModulePort`) e DTOs de leitura para comunicação entre módulos.
  - **Teste Automatizado de Arquitetura (Spring Modulith + ArchUnit):** O `ArchitectureFitnessTest` executa `ApplicationModules.of(CineDiaryApplication.class).verify()` (com `@NamedInterface("api")` nos subpacotes `api` de cada módulo) para bloquear acessos indevidos entre módulos, combinado com regras ArchUnit que garantem que `domain` não dependa de frameworks e que as 5 camadas internas respeitem a direção de dependência.
  - **Mobile (`cinediary-mobile`):**
    1. `src/app/` contém apenas arquivos de roteamento do Expo Router (5 a 15 linhas cada).
    2. `src/shared/` consolida `api`, `analytics`, `auth`, `config`, `i18n`, `theme` e `ui`.
    3. `src/features/{auth,catalog,diary,importing,stats,match}` divide cada feature em `domain/`, `application/`, `infrastructure/` e `presentation/{screens,components}`.

### ADR-02 · Autenticação Clerk (Usuário + E-mail + Senha) + Webhooks Svix Idempotentes
- **Decisão:** Login e cadastro utilizam exclusivamente `username + email + password` no Clerk (sem SSO e sem OTP de e-mail no MVP). O backend valida o JWT via OAuth2 Resource Server e sincroniza eventos pelo webhook Svix com deduplicação em `webhook_events`, proteção contra eventos fora de ordem (`clerk_event_timestamp`) e *soft delete* (`deleted_at` retornando HTTP 403).

### ADR-03 · Proxy Centralizado do TMDB no Backend com Cache Persistente e Fallback Offline
- **Decisão:** Todas as buscas (`/search`, `/popular`, `/genres`, `/{mediaType}/{tmdbId}`) passam pelo módulo `catalog` do backend com `language=pt-BR`, cache em `catalog_titles` / `catalog_seasons` (TTL de 7 dias para detalhes) e fallback automático para busca textual local (`source = CACHE`) se o TMDB estiver indisponível.

### ADR-04 (Revisado v2.0) · Onboarding Sem Mínimo Obrigatório e Estado `BUILDING` no Match
- **Contexto:** O usuário decidiu remover a obrigatoriedade de 10 filmes no onboarding (permitindo *"Pular por agora"* com 0 gêneros/títulos).
- **Decisão:**
  - `POST /api/v1/me/onboarding` aceita `genreIds` e `selectedTitleIds` vazios (`minItems: 0`).
  - Se o checkbox *"Adicionar ao meu histórico"* estiver marcado (`addToHistory = true`), o módulo `diary` grava `watched = true` em `user_title_states` (sem criar entradas sem data em `diary_entries`). Se desmarcado (`false`), grava apenas em `user_title_signals`.
  - Se qualquer participante de um Taste Match tiver `0` sinais/avaliações/gêneros, o Match assume `status = BUILDING` (*"Match em construção: registre alguns filmes para ver o resultado"*). Assim que ambos tiverem ao menos 1 sinal/gênero/avaliação, o Match passa automaticamente para `ACTIVE`.

### ADR-05 · Importação Assíncrona e Idempotente do Letterboxd
- **Decisão:** Upload seguro de `.zip` até `20 MB` (`POST /api/v1/imports/letterboxd`), job assíncrono reconciliando com `CatalogModulePort`, resumo pré-confirmação (`AWAITING_CONFIRMATION`) e persistência idempotente via `import_hash` (`SHA-256`). Ao confirmar, publica `ImportConfirmedEvent` via `ApplicationEventPublisher`, persistido pelo Spring Modulith em `event_publication` para projetar o histórico importado no Neo4j.

### ADR-06 (Revisado v2.1) · Neo4j 5 + Graph Data Science (GDS) + Outbox Nativo do Spring Modulith (`event_publication`)
- **Contexto:** O usuário propôs substituir o Outbox manual (`outbox_events` + poller customizado) pelo **Event Publication Registry nativo do Spring Modulith**, aproveitando os eventos que o próprio framework persiste e gerencia.
- **Decisão:**
  1. **Infraestrutura:** `docker-compose.yml` sobe `neo4j:5.26-community` com o plugin `graph-data-science` habilitado (`NEO4J_PLUGINS: '["graph-data-science"]'`). No `build.gradle.kts`, incluímos `org.springframework.modulith:spring-modulith-bom:2.1.2` (compatível com Spring Boot `4.1.2`), `spring-modulith-starter-jpa` e `spring-modulith-starter-test`.
  2. **Outbox Transacional Nativo (`event_publication`):** Mudanças em usuários/onboarding (`UserSyncedEvent`, `UserOnboardingCompletedEvent`), diário/notas (`TitleInteractionUpdatedEvent`) e importação (`ImportConfirmedEvent`) são publicadas como records imutáveis via `ApplicationEventPublisher` dentro do método `@Transactional`. O Spring Modulith grava automaticamente na tabela oficial `event_publication` na mesma transação do PostgreSQL.
  3. **Projeção Assíncrona e Resiliente no Grafo (`@ApplicationModuleListener` + `IncompleteEventPublications`):** O listener `TasteGraphModulithEventListener` (no módulo `match`) consome os eventos com `@ApplicationModuleListener` (executado em nova transação após o commit) e aciona `Neo4jTasteGraphProjector` para fazer `MERGE` de `(:User)`, `(:Title)`, `(:Genre)` e arestas `[:INTERACTED]`, `[:PREFERS_GENRE]` e `[:HAS_GENRE]`. O Spring Modulith marca `completion_date` e `status = COMPLETED` automaticamente, e reprocessa falhas via `IncompleteEventPublications.resubmitIncompletePublicationsOlderThan(...)` e `republish-outstanding-events-on-restart=true`.
  4. **Motor GDS (`Neo4jGdsTasteMatchEngineAdapter`):**
     - Executa cálculo de similaridade no grafo combinando `gds.similarity.cosine` (notas e pesos de afinidade — **50%**), `gds.similarity.jaccard` (gêneros — **30%**) e `gds.similarity.overlap` (favoritos/curtidos — **20%**), com redistribuição automática para **Modo Descoberta** (`65% Gêneros + 35% Favoritos/Sinais`) quando `< 3` títulos avaliados em comum.
     - Travessia Cypher extrai `bothLoved`, `disagreements`, `discoveryPicks` (*"O que um ama e o outro ainda não viu"*) e `jointRecommendations` (títulos não vistos por ambos conectados aos gêneros em comum).
     - Inclui fallback resiliente para SQL caso o container Neo4j esteja indisponível em ambiente de teste leve (`engineUsed = NEO4J_GDS | SQL_FALLBACK`).

---

## 2. Dicionário Oficial de Eventos do PostHog (Alinhado v2.0)

| Evento PostHog | Quando disparar | Propriedades obrigatórias |
| --- | --- | --- |
| `user_signed_up` | Cadastro concluído via Clerk | `auth_provider` (`'password'`), `from_invite` (`boolean`) |
| `onboarding_completed` | Sucesso em `POST /api/v1/me/onboarding` | `genres_count`, `titles_selected_count`, `favorites_count`, `added_to_history` (`boolean`), `skipped` (`boolean`), `from_invite` (`boolean`), `duration_seconds` |
| `title_logged` | Sucesso ao marcar assistido, dar nota ou criar entrada no diário | `tmdb_id`, `media_type` (`'MOVIE'` \| `'SERIES'`), `has_rating` (`boolean`), `has_review` (`boolean`), `is_rewatch` (`boolean`), `touch_count`, `scope` (`'title'` \| `'season'` \| `'episode'`) |
| `quick_log_opened` | Abriu o registro rápido (com `title_logged`, mede quem desiste no meio) | `entry_point` (`title_page`, `search`, `log_tab`, `home`, `series_season`, `series_episode`, `other`), `media_type`, `scope` |
| `import_started` | Envio do arquivo ZIP em `POST /api/v1/imports/letterboxd` | `provider` (`'LETTERBOXD'`), `file_size_bytes` |
| `import_completed` | Sucesso em `POST /api/v1/imports/{jobId}/confirm` | `job_id`, `matched_count`, `unmatched_count`, `duration_ms` |
| `import_failed` | Falha no envio do ZIP ou no processamento (job `FAILED`) | `stage` (`'upload'` \| `'processing'`), `error_code` (status HTTP, `network`, `client` ou `job_failed`) |
| `match_created` | Criação de convite em `POST /api/v1/matches` | `match_id` (sem o código do convite: com ele qualquer pessoa entra no Match) |
| `match_left` | Sucesso em `DELETE /api/v1/matches/{matchId}` (encerra para os dois) | `match_id`, `status` (antes de sair) |
| `match_invite_accepted` | Convidado aceita o Match (`POST /api/v1/matches/{inviteCode}/accept`) | `match_id`, `status` (`'ACTIVE'` \| `'BUILDING'`), `compatibility_score` (`number` \| `null`), `discovery_mode` (`boolean`) |
| `match_story_viewed` | Usuário visualiza o Match Story | `match_id`, `compatibility_score`, `slides_viewed_count` (`1..8`) |
| `match_story_shared` | Usuário compartilha um slide 9:16 fora do app | `match_id`, `slide_index` (`1..8`), `slide_type` |
| `recommendation_opened` | Tocou num título de uma seção de recomendação | `section` (`for_you`, `trending_week`, `because_you_liked`, `collection`, `similar`), `position` (a partir de 0), `tmdb_id`, `media_type`, `source` (origem do "Para você", opcional) |
| `search_performed` | Resultados de uma busca chegaram (uma vez por busca, depois do debounce) | `context` (`search_tab`, `log_tab`, `shared_watchlist`, `favorites`), `query_length`, `results_count`, `filter`, `from_cache` |
| `search_result_opened` | Escolheu um resultado da busca | `context`, `position`, `tmdb_id`, `media_type`, `query_length` |
| `title_marked` | Curtir, watchlist ou favorito ligado/desligado | `action` (`liked`, `watchlist`, `favorite`), `value` (`boolean`), `tmdb_id`, `media_type` |
| `episode_toggled` | Marcou/desmarcou episódios na lista de temporadas | `watched` (`boolean`), `count`, `whole_season` (`boolean`), `with_stills` (variante da flag `episode-stills`) |
| `trailer_opened` | Usuário abre o trailer na página do título (conversão do teste A/B `trailer-button-placement`) | `tmdb_id`, `media_type`, `placement` (`'meta'` \| `'actions'`) |
| `watch_provider_viewed` | A seção "Onde assistir" aparece na página do título (uma vez por abertura) | `tmdb_id`, `media_type`, `stream_count`, `rent_count`, `buy_count` |
| `entry_opened` | Abriu a tela de uma entrada do diário (pela Início, pelo diário ou por "Seus registros") | `has_review`, `contains_spoilers` |
| `entry_edited` | Salvou alterações numa entrada | `has_review`, `contains_spoilers` |
| `entry_deleted` | Excluiu uma entrada do diário | (nenhuma) |
| `entry_shared` | Gerou a imagem 9:16 da entrada e abriu o compartilhamento (a pessoa posta ela mesma) | `target` (`system_sheet` hoje; `instagram_stories` quando o editor do Stories abrir direto), `has_review` |
| `profile_updated` | Salvou "Editar perfil" | `name_changed`, `username_changed`, `bio_changed`, `pronouns_changed` (nunca os textos) |
| `profile_photo_changed` | Trocou ou removeu a foto do perfil | `action` (`set`, `removed`), `source` (`library`, `camera`) |
| `email_changed` | Confirmou o código e trocou o e-mail da conta | (nenhuma; nunca o e-mail) |
| `profile_viewed` | Abriu o perfil de outra pessoa | `relationship` (`FOLLOWING`, `REQUESTED`, `NONE`), `is_private`, `from` (`search`, `list`, `link`) |
| `user_followed` | Seguiu alguém (perfil privado: pediu para seguir) | `is_private`, `follows_you` |
| `user_unfollowed` | Deixou de seguir ou cancelou o pedido | `was_request` |
| `follow_request_answered` | Aprovou ou recusou um pedido para seguir | `approved` |
| `people_searched` | Resultados da busca de pessoas chegaram | `query_length`, `results_count` (nunca o texto buscado) |
| `setting_changed` | Mudou uma preferência nas Configurações | `key` (`show_spoilers`, `private_profile`, `default_reply_policy`), `value` (em `default_reply_policy`: true = mais fechado que "qualquer pessoa") |
| `entry_liked` | Curtiu ou tirou a curtida de uma entrada | `own_entry`, `liked` |
| `entry_replied` | Respondeu uma entrada | `own_entry`, `length` (nunca o texto) |
| `entry_reply_deleted` | Apagou uma resposta | `own_reply` (false: o dono da entrada apagou a resposta de outra pessoa) |
| `feed_item_opened` | Abriu um registro de quem você segue | `from` (`rail`, `feed`), `position` (a partir de 0), `has_review` |
| `friends_feed_opened` | Abriu "Ver tudo" das novidades dos amigos | (nenhuma) |
| `notifications_opened` | Abriu o sino | `unseen` (quantos não vistos havia) |
| `notification_opened` | Tocou num aviso do sino | `kind` (`FOLLOWED`, `FOLLOW_REQUESTED`, `FOLLOW_APPROVED`, `ENTRY_LIKED`, `ENTRY_REPLIED`) |

**Privacidade dos eventos.** Nenhum evento leva e-mail, nome, texto de review ou código de convite. A pessoa é identificada no PostHog pelo id do Clerk, com o `@username` como propriedade.

**Feature flags (PostHog).** Registradas em `cinediary-mobile/src/shared/analytics/featureFlags.ts` (chave, variantes e valor de reserva quando o PostHog está desligado ou a flag não existe).

| Flag | Tipo | Variantes | Reserva | Métrica |
| --- | --- | --- | --- | --- |
| `trailer-button-placement` | Multivariada (teste A/B) | `meta` (pílula abaixo dos dados) · `actions` (botão na fila de ações) | `actions` | `trailer_opened` |
| `episode-stills` | Booleana (liga/desliga) | ligada = imagem de cada episódio na lista de temporadas | ligada | `quick_log_opened` (`entry_point = series_episode`), `episode_toggled` |
