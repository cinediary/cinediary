import createClient, { type Middleware } from 'openapi-fetch';

import { env } from '@/shared/config/env';
import { nativeLocale } from '@/shared/i18n';
import { isApiUnreachable, probeApi, reportApiCall } from './network';
import type { components, paths } from './schema';

/** DTOs gerados do openapi-v1.yaml. Só a camada infrastructure das features deve usá-los. */
export type Schemas = components['schemas'];

type TokenProvider = () => Promise<string | null>;

let getAuthToken: TokenProvider = async () => null;

/** Chamado uma vez pelo SessionBridge, que conhece a sessão do Clerk. */
export function setAuthTokenProvider(provider: TokenProvider) {
  getAuthToken = provider;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getAuthToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    // Idioma do aparelho: o backend devolve títulos, sinopses e gêneros do TMDB nele (pt-BR ou en-US).
    request.headers.set('Accept-Language', nativeLocale);
    return request;
  },
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API respondeu ${status}`);
    this.name = 'ApiError';
  }
}

export const isNetworkError = (error: unknown) => error instanceof TypeError;

/** Sem tempo limite, um backend fora do ar deixa a tela carregando para sempre. */
const REQUEST_TIMEOUT_MS = 15_000;

/** fetch com tempo limite; chamadas pesadas (ex.: upload do ZIP) pedem um limite maior. */
export const fetchWithTimeoutOf =
  (timeoutMs: number) =>
  (request: Request): Promise<Response> => {
    // Já se sabe que a API não responde: falha na hora (como um erro de rede) em vez de esperar o tempo limite.
    // As consultas nem chegam aqui (o TanStack as pausa); isto vale para as ações, como registrar.
    if (isApiUnreachable()) {
      void probeApi();
      return Promise.reject(new TypeError('Network request failed'));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return reportApiCall(fetch(request, { signal: controller.signal })).finally(() => clearTimeout(timer));
  };

export const api = createClient<paths>({ baseUrl: env.apiUrl, fetch: fetchWithTimeoutOf(REQUEST_TIMEOUT_MS) });
api.use(authMiddleware);

/** Leva a chamada para o formato do TanStack Query: devolve o valor ou lança ApiError. */
export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined || !response.ok) throw new ApiError(response.status, error);
  return data as T;
}

/** Para respostas sem corpo (204). */
export async function unwrapVoid(call: Promise<{ error?: unknown; response: Response }>): Promise<void> {
  const { error, response } = await call;
  if (error !== undefined || !response.ok) throw new ApiError(response.status, error);
}
