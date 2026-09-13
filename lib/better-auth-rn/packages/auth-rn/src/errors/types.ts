/**
 * @title Types d'erreur HTTP
 * @description Shapes possibles du corps d'une réponse d'erreur API.
 *   L'API peut retourner l'une des formes suivantes :
 *     - `{ code, message }`          — format standard
 *     - `{ error: "message" }`        — format court
 *     - `{ error: { code, message } }` — format imbriqué
 */

export interface ApiErrorBody {
  /** Code métier court (ex. "INVALID_CREDENTIALS", "NOT_FOUND"). */
  code?: string;

  /** Message lisible. */
  message?: string;

  /**
   * Champ `error` polymorphe :
   *  - string courte  : `{ error: "Unauthorized" }`
   *  - objet structuré: `{ error: { code: "...", message: "..." } }`
   */
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
}
