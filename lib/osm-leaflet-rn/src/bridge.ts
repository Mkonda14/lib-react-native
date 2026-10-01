/**
 * Pont de communication RN ↔ WebView
 * =====================================
 * Protocole d'échange de messages entre React Native et la WebView Leaflet.
 *
 * Flux de communication :
 *   RN → WebView :  { type: 'init', payload: config }
 *                   { type: 'method', id, method, args }
 *   WebView → RN :  { type: 'ready', payload }
 *                   { type: 'event', payload }
 *                   { type: 'marker-press', payload }
 *                   { type: 'marker-drag', payload }
 *                   { type: 'user-location', payload }
 *                   { type: 'method-result', id, payload }
 *                   { type: 'error', payload }
 *                   { type: 'log', payload }
 *
 * Les appels de méthode sont basés sur les Promesses : quand RN appelle
 * une méthode sur la WebView, une Promesse est créée et résolue quand
 * la WebView renvoie 'method-result' avec l'id correspondant.
 */

import { uniqueId } from './utils/uid'
import type {
  BridgeMessage,
  MethodCall,
  MapConfig,
} from './types'
import { TILE_PROVIDERS } from './config'

export class MapBridge {
  /** Appels en attente de résolution (id → appel). */
  private pending = new Map<string, MethodCall>()
  /** Vrai quand la WebView a envoyé 'ready'. */
  private ready = false
  /** Vrai après dispose() : plus aucun envoi ni routage. */
  private disposed = false
  /** Promesse résolue quand le bridge est prêt (permet de mise en file les appels). */
  private readyPromise: Promise<void>
  private readyResolve!: () => void
  /** Fonction d'envoi de message vers la WebView. */
  private postMessage: (data: string) => void

  /* ---------------- Callbacks d'événements (définis par MapView) ---------------- */
  onEvent?: (payload: any) => void
  onMarkerPress?: (payload: any) => void
  onMarkerDrag?: (payload: any) => void
  onUserLocation?: (payload: any) => void
  onReady?: () => void
  onWebViewReady?: () => void
  onError?: (error: Error) => void
  onLog?: (payload: any) => void

  constructor(postMessage: (data: string) => void) {
    this.postMessage = postMessage
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  /**
   * Libérer le bridge au démontage : rejette les appels en attente, vide les
   * handlers et neutralise handleMessage/send (un message en vol ne doit pas
   * retenir la WebView ni appeler des callbacks d'un composant démonté).
   */
  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const call of this.pending.values()) {
      call.reject?.(new Error('Bridge démonté avant la fin de la méthode'))
    }
    this.pending.clear()
    this.onEvent = undefined
    this.onMarkerPress = undefined
    this.onMarkerDrag = undefined
    this.onUserLocation = undefined
    this.onReady = undefined
    this.onWebViewReady = undefined
    this.onError = undefined
    this.onLog = undefined
    // Débloque les appels mis en file avant le dispose : ils passeront dans
    // send() neutralisé puis expireront proprement via leur timeout.
    this.ready = true
    this.readyResolve()
  }

  /**
   * Forcer le status ready en cas de délai de sécurité.
   */
  forceReady() {
    if (!this.ready) {
      this.ready = true
      this.readyResolve()
      this.onReady?.()
    }
  }

  /**
   * Envoie le message d'initialisation avec la configuration de la carte.
   * Les fournisseurs de tuiles sont injectés automatiquement dans le payload.
   */
  init(config: MapConfig) {
    const configWithProviders = {
      ...config,
      _tileProviders: TILE_PROVIDERS,
    }
    this.send('init', configWithProviders)
  }

  /**
   * Appelle une méthode sur la WebView et renvoie une Promesse.
   * L'appel est mis en file si le bridge n'est pas encore prêt.
   * Timeout après 30 secondes pour éviter les appels bloqués.
   *
   * @param method - Nom de la méthode côté WebView (ex : 'moveTo', 'addMarker')
   * @param args   - Arguments à transmettre à la méthode
   * @returns Promesse résolue avec le résultat ou rejetée en cas d'erreur
   */
  call<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    if (this.disposed) {
      return Promise.reject(new Error(`Bridge démonté (méthode "${method}")`))
    }
    return this.readyPromise.then(() => {
      return new Promise<T>((resolve, reject) => {
        const id = uniqueId('call')
        const call: MethodCall<T> = {
          id,
          method,
          args,
          resolve,
          reject,
        }
        this.pending.set(id, call as MethodCall)
        this.send('method', { id, method, args })

        // Timeout après 30 secondes
        setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id)
            reject(new Error(`La méthode "${method}" a expiré après 30s`))
          }
        }, 30000)
      })
    })
  }

  /**
   * Traite un message reçu de la WebView.
   * Parse le JSON et route vers le bon handler selon le type de message.
   *
   * @param rawData - Chaîne JSON reçue depuis la WebView
   */
  handleMessage(rawData: string) {
    if (this.disposed) return
    let msg: BridgeMessage
    try {
      msg = JSON.parse(rawData)
    } catch (e) {
      this.onError?.(new Error(`Échec du parsing du message : ${(e as Error).message}`))
      return
    }

    switch (msg.type) {
      // Le JS de la WebView signale qu'il écoute
      case 'webview-ready':
        this.onWebViewReady?.()
        break

      // La WebView est prête → résoudre la promesse de ready
      case 'ready':
        this.ready = true
        this.readyResolve()
        this.onReady?.()
        break

      // Événement de carte (clic, déplacement, zoom)
      case 'event':
        this.onEvent?.(msg.payload)
        break

      // Un marqueur a été pressé
      case 'marker-press':
        this.onMarkerPress?.(msg.payload)
        break

      // Un marqueur a été déplacé (drag)
      case 'marker-drag':
        this.onMarkerDrag?.(msg.payload)
        break

      // Position de l'utilisateur mise à jour
      case 'user-location':
        this.onUserLocation?.(msg.payload)
        break

      // Résultat d'un appel de méthode → résoudre la Promesse correspondante
      case 'method-result':
        if (msg.id && this.pending.has(msg.id)) {
          const call = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          call.resolve?.(msg.payload)
        }
        break

      // Erreur → rejeter la Promesse ou notifier le callback d'erreur
      case 'error': {
        const errorPayload = msg.payload as { message?: string } | undefined
        const errorMessage = errorPayload?.message ?? 'Erreur inconnue'
        if (msg.id && this.pending.has(msg.id)) {
          const call = this.pending.get(msg.id)!
          this.pending.delete(msg.id)
          call.reject?.(new Error(errorMessage))
        } else {
          this.onError?.(new Error(errorMessage))
        }
        break
      }

      // Log console depuis la WebView
      case 'log':
        this.onLog?.(msg.payload)
        break
    }
  }

  /**
   * Envoie un message vers la WebView.
   *
   * @param type    - Type du message (BridgeMessageType)
   * @param payload - Données du message
   */
  private send(type: string, payload?: unknown) {
    if (this.disposed) return
    const msg = JSON.stringify({ type, payload })
    this.postMessage(msg)
  }

  /**
   * Attend que le bridge soit prêt (init terminé).
   * Les appels effectués avant le ready sont automatiquement mis en file.
   */
  waitReady(): Promise<void> {
    return this.readyPromise
  }

  /**
   * Réinitialise le bridge (utile pour le hot-reload / ré-initialisation).
   */
  reset() {
    this.ready = false
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }
}
