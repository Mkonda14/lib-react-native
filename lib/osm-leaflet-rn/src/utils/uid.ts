/**
 * Générateur d'identifiants uniques — zéro dépendance
 * =====================================================
 *
 * Génère des identifiants de la forme :
 *   `${prefix}_${horodatage_base36}_${compteur_base36}_${aléatoire_4_car}`
 *
 * Combinaison de trois composants pour réduire les collisions :
 *  - horodatage : unique dans le temps
 *  - compteur   : incrémental dans le processus (gère les appels simultanés)
 *  - aléatoire  : s'assure l'unicité entre reloads / instances
 */

let _idCounter = 0

/**
 * Génère un identifiant unique.
 *
 * @param prefix - Préfixe optionnel pour le contexte d'utilisation
 *                 (ex : 'marker', 'call')
 * @returns Identifiant unique
 */
export function uniqueId(prefix = 'id'): string {
  _idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}
