/**
 * Variantes de marqueurs — icônes POI par catégorie
 * ====================================================
 * Chaque variante combine une couleur sémantique et un pictogramme blanc
 * centré dans un pin (style POI Google Maps). La résolution se fait côté
 * React Native via `resolveMarkerVariant` : la WebView ne voit que le
 * `iconHtml` final (aucune régénération de leaflet.html nécessaire).
 *
 * Glyphes SVG extraits de lucide-react-native@1.34.0 (https://lucide.dev)
 * — licence ISC, © Lucide Contributors. Données figées : ne pas éditer à la
 * main sans repasser par le script d'extraction.
 *
 * Précédence de rendu : `iconHtml` explicite > `variant` > pin par défaut.
 */
import type { MarkerData } from './types'

/** Nœud SVG simplifié [tag, attributs] (format lucide, sans clé React). */
type LucideGlyphNode = [string, Record<string, string>]

const GLYPHS: Record<string, LucideGlyphNode[]> = {
  "building-2": [["path",{"d":"M10 12h4"}],["path",{"d":"M10 8h4"}],["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"}],["path",{"d":"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"}]],
  "bed": [["path",{"d":"M2 4v16"}],["path",{"d":"M2 8h18a2 2 0 0 1 2 2v10"}],["path",{"d":"M2 17h20"}],["path",{"d":"M6 8v9"}]],
  "hospital": [["path",{"d":"M12 7v4"}],["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"M14 9h-4"}],["path",{"d":"M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"}],["path",{"d":"M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16"}]],
  "pill": [["path",{"d":"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"}],["path",{"d":"m8.5 8.5 7 7"}]],
  "utensils": [["path",{"d":"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"}],["path",{"d":"M7 2v20"}],["path",{"d":"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"}]],
  "coffee": [["path",{"d":"M10 2v2"}],["path",{"d":"M14 2v2"}],["path",{"d":"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"}],["path",{"d":"M6 2v2"}]],
  "store": [["path",{"d":"M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"}],["path",{"d":"M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"}],["path",{"d":"M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"}]],
  "landmark": [["path",{"d":"M10 18v-7"}],["path",{"d":"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"}],["path",{"d":"M14 18v-7"}],["path",{"d":"M18 18v-7"}],["path",{"d":"M3 22h18"}],["path",{"d":"M6 18v-7"}]],
  "banknote": [["rect",{"width":"20","height":"12","x":"2","y":"6","rx":"2"}],["circle",{"cx":"12","cy":"12","r":"2"}],["path",{"d":"M6 12h.01M18 12h.01"}]],
  "school": [["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"M18 4.933V21"}],["path",{"d":"m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6"}],["path",{"d":"m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"}],["path",{"d":"M6 4.933V21"}],["circle",{"cx":"12","cy":"9","r":"2"}]],
  "church": [["path",{"d":"M10 9h4"}],["path",{"d":"M12 7v5"}],["path",{"d":"M14 21v-3a2 2 0 0 0-4 0v3"}],["path",{"d":"m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9"}],["path",{"d":"M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14"}]],
  "fuel": [["path",{"d":"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"}],["path",{"d":"M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"}],["path",{"d":"M2 21h13"}],["path",{"d":"M3 9h11"}]],
  "tree-pine": [["path",{"d":"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"}],["path",{"d":"M12 22v-3"}]],
  "square-parking": [["rect",{"width":"18","height":"18","x":"3","y":"3","rx":"2"}],["path",{"d":"M9 17V7h4a3 3 0 0 1 0 6H9"}]],
  "shield": [["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]],
  "train-front": [["path",{"d":"M8 3.1V7a4 4 0 0 0 8 0V3.1"}],["path",{"d":"m9 15-1-1"}],["path",{"d":"m15 15 1-1"}],["path",{"d":"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"}],["path",{"d":"m8 19-2 3"}],["path",{"d":"m16 19 2 3"}]],
  "palette": [["path",{"d":"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"}],["circle",{"cx":"13.5","cy":"6.5","r":".5","fill":"currentColor"}],["circle",{"cx":"17.5","cy":"10.5","r":".5","fill":"currentColor"}],["circle",{"cx":"6.5","cy":"12.5","r":".5","fill":"currentColor"}],["circle",{"cx":"8.5","cy":"7.5","r":".5","fill":"currentColor"}]],
  "briefcase": [["path",{"d":"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}],["rect",{"width":"20","height":"14","x":"2","y":"6","rx":"2"}]],
  "plane": [["path",{"d":"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"}]],
}

/** Définition d'une variante de marqueur. */
export interface MarkerVariantDef {
  /** Libellé anglais (debug / UI). */
  label: string
  /** Couleur par défaut du pin (hex). */
  color: string
  /** Pictogramme blanc superposé (null = pin nu, variante `default`). */
  glyph: readonly LucideGlyphNode[] | null
}

/**
 * Catalogue des variantes disponibles (clés = valeurs acceptées par
 * `MarkerData.variant`, en anglais).
 */
export const MARKER_VARIANTS = {
  default: { label: 'Default', color: '#EA4335', glyph: null },
  building: { label: 'Building', color: '#6B7280', glyph: GLYPHS['building-2'] },
  hotel: { label: 'Hotel', color: '#6366F1', glyph: GLYPHS['bed'] },
  hospital: { label: 'Hospital', color: '#DC2626', glyph: GLYPHS['hospital'] },
  pharmacy: { label: 'Pharmacy', color: '#16A34A', glyph: GLYPHS['pill'] },
  restaurant: { label: 'Restaurant', color: '#F97316', glyph: GLYPHS['utensils'] },
  cafe: { label: 'Cafe', color: '#B45309', glyph: GLYPHS['coffee'] },
  store: { label: 'Store', color: '#0891B2', glyph: GLYPHS['store'] },
  bank: { label: 'Bank', color: '#4F46E5', glyph: GLYPHS['landmark'] },
  atm: { label: 'ATM', color: '#047857', glyph: GLYPHS['banknote'] },
  school: { label: 'School', color: '#D97706', glyph: GLYPHS['school'] },
  religious: { label: 'Religious', color: '#7C3AED', glyph: GLYPHS['church'] },
  fuel: { label: 'Fuel', color: '#EA580C', glyph: GLYPHS['fuel'] },
  park: { label: 'Park', color: '#15803D', glyph: GLYPHS['tree-pine'] },
  parking: { label: 'Parking', color: '#2563EB', glyph: GLYPHS['square-parking'] },
  police: { label: 'Police', color: '#1E40AF', glyph: GLYPHS['shield'] },
  transit: { label: 'Transit', color: '#CA8A04', glyph: GLYPHS['train-front'] },
  museum: { label: 'Museum', color: '#92400E', glyph: GLYPHS['palette'] },
  office: { label: 'Office', color: '#475569', glyph: GLYPHS['briefcase'] },
  airport: { label: 'Airport', color: '#0284C7', glyph: GLYPHS['plane'] },
} as const satisfies Record<string, MarkerVariantDef>

/** Valeurs acceptées par `MarkerData.variant` (dérivées du catalogue). */
export type MarkerVariant = keyof typeof MARKER_VARIANTS

/** Taille par défaut : pin 24×34 mis à l'échelle 34 px de large (×1,4 ≈ 48). */
const VARIANT_DEFAULT_WIDTH = 34

function glyphToHtml(nodes: readonly LucideGlyphNode[]): string {
  return nodes
    .map(([tag, attrs]) => {
      const pairs = Object.entries(attrs)
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => {
          const v = String(value).replace(/currentColor/g, '#FFFFFF')
          return `${key}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
        })
        .join(' ')
      return `<${tag} ${pairs}/>`
    })
    .join('')
}

/**
 * Génère le HTML d'un marqueur de variante : pin (même tracé que le preset
 * `pin`) rempli avec la couleur de la variante + pictogramme blanc centré.
 *
 * @param variant - Variante (`'pharmacy'`, `'hospital'`…)
 * @param color   - Surcharge de couleur (hex) — sinon couleur de la variante
 * @param width   - Largeur en pixels (défaut 34 → hauteur 48)
 */
export function getVariantIconHtml(
  variant: MarkerVariant,
  color?: string,
  width: number = VARIANT_DEFAULT_WIDTH,
): string {
  const def = MARKER_VARIANTS[variant] ?? MARKER_VARIANTS.default
  const fill = color ?? def.color
  const height = Math.round((width * 34) / 24)
  const glyphHtml = def.glyph
    ? `<g transform="translate(5 5) scale(0.58333)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyphToHtml(def.glyph)}</g>`
    : `<circle cx="12" cy="12" r="5" fill="white"/>`
  return (
    `<svg width="${width}" height="${height}" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="${fill}" stroke="white" stroke-width="2"/>` +
    glyphHtml +
    `</svg>`
  )
}

/**
 * Résout la visuelle d'un marqueur (ou d'une mise à jour partielle) :
 * si `variant` est présent et qu'aucun `iconHtml` explicite n'est fourni,
 * remplit `iconHtml` / `iconSize` / `iconAnchor` (seuls les champs absents
 * sont renseignés). Fonction pure — utilisée par MapView (sync + méthodes
 * imperatives) juste avant l'envoi bridge.
 */
export function resolveMarkerVariant<M extends Partial<MarkerData>>(marker: M): M {
  if (!marker.variant || marker.iconHtml) return marker
  const variant: MarkerVariant = MARKER_VARIANTS[marker.variant]
    ? marker.variant
    : 'default'
  return {
    ...marker,
    iconHtml: getVariantIconHtml(variant, marker.iconColor),
    iconSize: marker.iconSize ?? { width: 34, height: 48 },
    iconAnchor: marker.iconAnchor ?? { x: 17, y: 48 },
  }
}
