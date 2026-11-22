/**
 * Contrato dos eventos do PostHog.
 * Fonte oficial: docs/architecture/ADRs-e-Especificacao-de-Tasks.md, seção 2 (v2).
 * Adicionar evento novo = adicionar aqui primeiro.
 */
export type MediaType = 'MOVIE' | 'SERIES';
/** MVP: só usuário + e-mail + senha (sem SSO). */
export type AuthProvider = 'password';
export type StorySlideType =
  'OPENING' | 'SCORE' | 'BREAKDOWN' | 'GENRES' | 'BOTH_LOVED' | 'DISAGREEMENTS' | 'DISCOVERY' | 'RECOMMENDATIONS' | 'CLOSING';

/** De onde o registro rápido foi aberto. */
export type QuickLogEntryPoint =
  | 'title_page'
  | 'search'
  | 'log_tab'
  | 'home'
  | 'series_season'
  | 'series_episode'
  /** "Registrar no meu diário" depois de aceitar uma marcação ("vi com…"). */
  | 'watched_with'
  | 'other';
/** Título inteiro, uma temporada ou um episódio (séries). */
export type LogScope = 'title' | 'season' | 'episode';
export type RecommendationSection = 'for_you' | 'trending_week' | 'because_you_liked' | 'collection' | 'similar';
/** Onde a busca do catálogo está sendo usada. */
export type SearchContext = 'search_tab' | 'log_tab' | 'shared_watchlist' | 'favorites';

export interface AnalyticsEvents {
  user_signed_up: { auth_provider: AuthProvider; from_invite: boolean };
  user_signed_in: { auth_provider: AuthProvider };
  user_signed_out: Record<string, never>;
  onboarding_completed: {
    genres_count: number;
    titles_selected_count: number;
    favorites_count: number;
    added_to_history: boolean;
    skipped: boolean;
    from_invite: boolean;
    imported_from_letterboxd: boolean;
    duration_seconds: number;
  };
  /** A pergunta do Letterboxd no onboarding: importar agora ou depois. */
  onboarding_import_choice: { choice: 'import' | 'later' };
  title_logged: {
    tmdb_id: number;
    media_type: MediaType;
    has_rating: boolean;
    has_review: boolean;
    is_rewatch: boolean;
    touch_count: number;
    scope: LogScope;
    /** Quantas pessoas foram marcadas no "Vi com…". */
    companions_count: number;
  };
  /** Abriu o registro rápido; junto com title_logged mostra quantos desistem no meio. */
  quick_log_opened: { entry_point: QuickLogEntryPoint; media_type: MediaType; scope: LogScope };
  import_started: { provider: 'LETTERBOXD'; file_size_bytes: number };
  import_completed: {
    job_id: string;
    matched_count: number;
    unmatched_count: number;
    duration_ms: number;
  };
  /** `stage`: no envio do ZIP ou no processamento no servidor. `error_code`: status HTTP, "network" ou "job_failed". */
  import_failed: { stage: 'upload' | 'processing'; error_code: string };
  /** Sem o código do convite: com ele qualquer pessoa entra no Match; não vai para ferramenta de terceiros. */
  match_created: { match_id: string };
  match_left: { match_id: string; status: 'PENDING' | 'BUILDING' | 'ACTIVE' | 'ARCHIVED' };
  match_invite_accepted: {
    match_id: string;
    status: 'ACTIVE' | 'BUILDING';
    compatibility_score: number | null;
    discovery_mode: boolean;
  };
  match_story_viewed: { match_id: string; compatibility_score: number | null; slides_viewed_count: number };
  match_story_shared: { match_id: string; slide_index: number; slide_type: StorySlideType };
  /** Tocou num título de uma seção de recomendação (`position` começa em 0; `source`: de onde veio o "Para você"). */
  recommendation_opened: {
    section: RecommendationSection;
    position: number;
    tmdb_id: number;
    media_type: MediaType;
    source?: string;
  };
  /** Uma vez por busca (depois do debounce), quando os resultados chegam. */
  search_performed: {
    context: SearchContext;
    query_length: number;
    results_count: number;
    filter: 'ALL' | 'MOVIE' | 'SERIES';
    from_cache: boolean;
  };
  search_result_opened: { context: SearchContext; position: number; tmdb_id: number; media_type: MediaType; query_length: number };
  /** Curtir, watchlist ou favorito ligado (`value: true`) ou desligado. */
  title_marked: { action: 'liked' | 'watchlist' | 'favorite'; value: boolean; tmdb_id: number; media_type: MediaType };
  /** Marcou/desmarcou episódios na lista de temporadas (`count`: quantos de uma vez; temporada inteira = todos). */
  episode_toggled: { watched: boolean; count: number; whole_season: boolean; with_stills: boolean };
  entry_opened: { has_review: boolean; contains_spoilers: boolean };
  entry_edited: { has_review: boolean; contains_spoilers: boolean };
  entry_deleted: Record<string, never>;
  /** Imagem da entrada gerada e enviada: `target` diz por onde (folha do sistema ou direto no Stories). */
  entry_shared: { target: 'system_sheet' | 'instagram_stories'; has_review: boolean };
  /** Salvou o perfil (nome e/ou @). Nunca leva o nome ou o @ em si. */
  profile_updated: { name_changed: boolean; username_changed: boolean; bio_changed: boolean; pronouns_changed: boolean };
  profile_photo_changed: { action: 'set' | 'removed'; source?: 'library' | 'camera' };
  /** Trocou o e-mail da conta (depois de confirmar o código). Nunca leva o e-mail. */
  email_changed: Record<string, never>;
  /** Abriu o perfil de outra pessoa. `relationship`: como você está em relação a ela. */
  profile_viewed: { relationship: 'FOLLOWING' | 'REQUESTED' | 'NONE'; is_private: boolean; from: 'search' | 'list' | 'link' };
  user_followed: { is_private: boolean; follows_you: boolean };
  user_unfollowed: { was_request: boolean };
  follow_request_answered: { approved: boolean };
  people_searched: { query_length: number; results_count: number };
  /** Mudou uma preferência nas Configurações. */
  /** `default_reply_policy`: `value` true = ficou mais fechado que "qualquer pessoa". */
  setting_changed: { key: 'show_spoilers' | 'private_profile' | 'default_reply_policy' | 'approve_companions'; value: boolean };
  entry_liked: { own_entry: boolean; liked: boolean };
  entry_replied: { own_entry: boolean; length: number };
  entry_reply_deleted: { own_reply: boolean };
  entry_reply_edited: { length: number };
  /** Feed de amigos: abriu um registro pela faixa da Início ou pela tela "Ver tudo". */
  feed_item_opened: { from: 'rail' | 'feed'; position: number; has_review: boolean };
  friends_feed_opened: Record<string, never>;
  notifications_opened: { unseen: number };
  notification_opened: {
    kind: 'FOLLOWED' | 'FOLLOW_REQUESTED' | 'FOLLOW_APPROVED' | 'ENTRY_LIKED' | 'ENTRY_REPLIED' | 'ENTRY_COMPANION';
  };
  /** "Vi com…": a pessoa marcada aceitou, recusou ou tirou a marcação. */
  entry_companion_responded: { response: 'accept' | 'decline' | 'remove' };
  /** Conversão do teste A/B "trailer-button-placement": `placement` é a variante que a pessoa viu. */
  trailer_opened: { tmdb_id: number; media_type: MediaType; placement: 'meta' | 'actions' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
