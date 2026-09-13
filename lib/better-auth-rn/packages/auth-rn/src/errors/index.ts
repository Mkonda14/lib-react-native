import type { ApiErrorBody } from "./types";
export type { ApiErrorBody };

/**
 * @title Erreur API typée
 * @description Classe d'erreur portant le statut HTTP et le code métier.
 * Utilisée par toute la couche api et par les services métier pour un
 * traitement différencié (ex. 401 → session expirée, 0 → hors-ligne).
 * @role Couche API, services, stores, UI (messages français)
 * @param statusCode Statut HTTP (0 = réseau/temps de transport)
 * @param code Code métier court en MAJUSCULES (ex. NETWORK_ERROR, INVALID_ID)
 * @param message Message lisible en français
 * @constraint Instancier via les helpers de la couche api, pas à la main.
 */

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Vrai si 401 ou 403. */
  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  /** Vrai si timeout. */
  get isTimeout(): boolean {
    return this.statusCode === 408
  }

  /** Vrai si erreur réseau (status 0). */
  get isNetworkError(): boolean {
    return this.statusCode === 0
  }
}

/**
 * @title Parsing du corps d'erreur HTTP
 * @description Extrait `{ code, message }` d'une réponse non-OK, en tolérant
 * les formats de l'API : `{ code, message }`, `{ error: "..." }` ou
 * `{ error: { code, message } }`. Retourne un repli générique si le corps
 * n'est pas du JSON exploitable.
 * @role Client HTTP (apiFetch)
 * @param response Réponse fetch non-OK
 * @returns Paire code/message ; jamais null
 * @constraint Ne jamais propager le corps brut : toujours normaliser.
 */
export async function parseErrorBody(
  response: Response
): Promise<{ code: string; message: string }> {
  const fallback = {
    code: "HTTP_ERROR",
    message: `Erreur HTTP ${response.status}`,
  };

  try {
    const body = (await response.json()) as ApiErrorBody;
    const nested =
      typeof body.error === "object" ? body.error : undefined;

    const code = body.code ?? nested?.code ?? fallback.code;
    let message =
      body.message ??
      nested?.message ??
      (typeof body.error === "string" ? body.error : fallback.message);

    if (typeof message !== "string") {
      message = fallback.message;
    }

    return { code, message };
  } catch {
    return fallback;
  }
}
