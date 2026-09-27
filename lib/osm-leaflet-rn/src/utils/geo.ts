/**
 * Utilitaires géographiques — fonctions pures, zéro dépendance
 * =============================================================
 *
 * Toutes les fonctions sont indépendantes de React et de la carte :
 * elles peuvent être utilisées partout (tests, calculs côté RN, etc.).
 */

import type { LatLng, LatLngBounds, BoundingBox } from '../types'

/* ------------------------------------------------------------------ *
 * Distance (formule de Haversine)
 * ------------------------------------------------------------------ */

/**
 * Calcule la distance en mètres entre deux points GPS
 * en utilisant la formule de Haversine (sphère terrestre).
 *
 * @param a - Point de départ
 * @param b - Point d'arrivée
 * @returns Distance en mètres
 */
export function distance(a: LatLng, b: LatLng): number {
  const R = 6371e3 // Rayon de la Terre en mètres
  const φ1 = toRad(a.lat)
  const φ2 = toRad(b.lat)
  const Δφ = toRad(b.lat - a.lat)
  const Δλ = toRad(b.lng - a.lng)

  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  return R * c
}

/**
 * Distance entre deux points en kilomètres (wrapper de distance()).
 *
 * @param a - Point de départ
 * @param b - Point d'arrivée
 * @returns Distance en kilomètres
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  return distance(a, b) / 1000
}

/* ------------------------------------------------------------------ *
 * Bornes (bounds)
 * ------------------------------------------------------------------ */

/**
 * Calcule les bornes englobantes d'une liste de points.
 *
 * @param points - Liste non vide de points GPS
 * @returns Bornes englobantes ou null si la liste est vide
 */
export function boundsFromPoints(points: LatLng[]): LatLngBounds | null {
  if (points.length === 0) return null
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return {
    northEast: { lat: maxLat, lng: maxLng },
    southWest: { lat: minLat, lng: minLng },
  }
}

/**
 * Convertit des bornes objet en tableau [south, west, north, east]
 * (format BBox GeoJSON).
 */
export function boundsToArray(bounds: LatLngBounds): BoundingBox {
  return [
    bounds.southWest.lat,
    bounds.southWest.lng,
    bounds.northEast.lat,
    bounds.northEast.lng,
  ]
}

/**
 * Convertit un tableau BBox [south, west, north, east] en objet bornes.
 */
export function boundsFromArray([s, w, n, e]: BoundingBox): LatLngBounds {
  return {
    southWest: { lat: s, lng: w },
    northEast: { lat: n, lng: e },
  }
}

/**
 * Vérifie si un point se trouve à l'intérieur des bornes données (inclusif).
 */
export function isPointInBounds(point: LatLng, bounds: LatLngBounds): boolean {
  return (
    point.lat >= bounds.southWest.lat &&
    point.lat <= bounds.northEast.lat &&
    point.lng >= bounds.southWest.lng &&
    point.lng <= bounds.northEast.lng
  )
}

/* ------------------------------------------------------------------ *
 * Centre / centroïde
 * ------------------------------------------------------------------ */

/**
 * Calcule le centroïde (barycentre) d'une liste de points.
 * Attention : ne tient pas compte des distorsions de projection
 * (approximation correcte pour de petites zones).
 *
 * @returns Centre moyen ou null si la liste est vide
 */
export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null
  let lat = 0
  let lng = 0
  for (const p of points) {
    lat += p.lat
    lng += p.lng
  }
  return { lat: lat / points.length, lng: lng / points.length }
}

/* ------------------------------------------------------------------ *
 * Longueur de polyligne
 * ------------------------------------------------------------------ */

/**
 * Calcule la longueur totale d'une polyligne en mètres
 * en additionnant les distances entre points consécutifs.
 *
 * @returns Longueur en mètres (0 si moins de 2 points)
 */
export function polylineLength(points: LatLng[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i])
  }
  return total
}

/* ------------------------------------------------------------------ *
 * Test point dans un polygone (algorithme ray casting)
 * ------------------------------------------------------------------ */

/**
 * Détermine si un point est à l'intérieur d'un polygone fermé
 * en utilisant l'algorithme de ray casting (lancer de rayon).
 *
 * @param point   - Point à tester
 * @param polygon - Liste ordonnée de sommets (>= 3 points)
 * @returns true si le point est à l'intérieur du polygone
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat
    const yi = polygon[i].lng
    const xj = polygon[j].lat
    const yj = polygon[j].lng
    // Intersection du segment (xi,yi)-(xj,yj) avec la droite horizontale passant par le point
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/* ------------------------------------------------------------------ *
 * Cercle englobant
 * ------------------------------------------------------------------ */

/**
 * Calcule le rayon minimal (en mètres) d'un cercle centré sur `center`
 * contenant tous les points fournis.
 *
 * @param center - Centre du cercle
 * @param points - Points à inclure
 * @returns Rayon en mètres
 */
export function boundingCircleRadius(center: LatLng, points: LatLng[]): number {
  let max = 0
  for (const p of points) {
    const d = distance(center, p)
    if (d > max) max = d
  }
  return max
}

/* ------------------------------------------------------------------ *
 * Décodage de polyline encodée (format Google)
 * ------------------------------------------------------------------ */

/**
 * Décode une polyline encodée au format Google Maps
 * (encodage « polyline precision 5 » utilisé par les Directions API).
 *
 * Chaque coordonnée est encodée comme un entier delta avec des caractères
 * de 63 à 126, en groupes de 5 bits avec un bit de continuation.
 *
 * @param encoded   - Chaîne encodée
 * @param precision - Nombre de décimales (5 par défaut = précision Google)
 * @returns Liste de points GPS décodés
 */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = Math.pow(10, precision)
  const coordinates: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let byte: number | null = null
    let shift = 0
    let result = 0

    // Décoder la latitude (entier delta variable length)
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    // Décoder la longitude
    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push({
      lat: lat / factor,
      lng: lng / factor,
    })
  }

  return coordinates
}

/* ------------------------------------------------------------------ *
 * Formats d'affichage
 * ------------------------------------------------------------------ */

/**
 * Formate une distance en unités lisibles :
 *   - < 1 km  → « 450 m »
 *   - < 10 km → « 4.5 km »
 *   - >= 10 km → « 12 km » (arrondi)
 *
 * @param meters - Distance en mètres
 * @returns Chaîne formatée
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters / 1000)} km`
}

/**
 * Formate des coordonnées GPS en notation lisible :
 *   « 48.85660° N, 2.35220° E »
 *
 * @param latlng   - Point GPS
 * @param decimals - Nombre de décimales (5 par défaut)
 * @returns Chaîne formatée avec hémisphères
 */
export function formatLatLng(latlng: LatLng, decimals = 5): string {
  const lat = latlng.lat.toFixed(decimals)
  const lng = latlng.lng.toFixed(decimals)
  const latDir = latlng.lat >= 0 ? 'N' : 'S'
  const lngDir = latlng.lng >= 0 ? 'E' : 'W'
  return `${lat}° ${latDir}, ${lng}° ${lngDir}`
}

/* ------------------------------------------------------------------ *
 * Conversions d'angles
 * ------------------------------------------------------------------ */

/** Convertit des degrés en radians. */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Convertit des radians en degrés. */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/* ------------------------------------------------------------------ *
 * Cap (bearing) — direction de A vers B
 * ------------------------------------------------------------------ */

/**
 * Calcule le cap (bearing) en degrés entre deux points,
 * mesuré depuis le nord géographique dans le sens des aiguilles
 * d'une montre (0° = nord, 90° = est, 180° = sud, 270° = ouest).
 *
 * @returns Cap en degrés dans [0, 360)
 */
export function bearing(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat)
  const φ2 = toRad(b.lat)
  const Δλ = toRad(b.lng - a.lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return (toDeg(θ) + 360) % 360
}

/* ------------------------------------------------------------------ *
 * Interpolation linéaire
 * ------------------------------------------------------------------ */

/**
 * Interpole linéairement entre deux points.
 *
 * @param t - Facteur entre 0 (point a) et 1 (point b)
 * @returns Point interpolé
 */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  }
}

/* ------------------------------------------------------------------ *
 * Point d'destination (à partir d'un point, d'un cap et d'une distance)
 * ------------------------------------------------------------------ */

/**
 * Calcule le point d'arrivée à partir d'un point de départ,
 * d'un cap en degrés et d'une distance en mètres (sphère terrestre).
 *
 * Utilisé par exemple pour placer un marqueur à distance fixe
 * dans une direction donnée.
 *
 * @param start      - Point de départ
 * @param bearingDeg - Cap en degrés (0 = nord)
 * @param distanceM  - Distance en mètres
 * @returns Point d'arrivée (longitude normalisée dans [-180, 180])
 */
export function destinationPoint(
  start: LatLng,
  bearingDeg: number,
  distanceM: number
): LatLng {
  const R = 6371e3
  const δ = distanceM / R
  const θ = toRad(bearingDeg)
  const φ1 = toRad(start.lat)
  const λ1 = toRad(start.lng)

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  )
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    )

  return {
    lat: toDeg(φ2),
    lng: ((toDeg(λ2) + 540) % 360) - 180,
  }
}
