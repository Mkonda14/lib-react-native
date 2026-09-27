/**
 * GoogleSearchBar — barre de recherche et filtres style Google Maps
 * ==================================================================
 * Barre flottante en haut de la carte, avec :
 *  - Champ de recherche arrondi avec badge « G » et bouton micro
 *  - Avatar du profil (appel onProfilePress)
 *  - Pastilles de catégories horizontales (restaurants, essence, etc.)
 *
 * Composant purement présentiel : la recherche est contrôlée par le parent
 * via value / onChangeText, et la sélection de catégorie remonte via
 * onCategorySelect.
 */

import * as React from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native'

/** Catégorie de recherche affichée sous forme de pastille. */
export interface CategoryChip {
  id: string
  label: string
  icon: string
}

/** Liste des catégories par défaut (icônes emoji). */
export const GOOGLE_CATEGORIES: CategoryChip[] = [
  { id: 'restaurants', label: 'Restaurants', icon: '🍕' },
  { id: 'gas', label: 'Essence', icon: '⛽' },
  { id: 'groceries', label: 'Courses', icon: '🛒' },
  { id: 'coffee', label: 'Café', icon: '☕' },
  { id: 'hotels', label: 'Hôtels', icon: '🏨' },
  { id: 'pharmacy', label: 'Pharmacie', icon: '💊' },
  { id: 'attractions', label: 'Monuments', icon: '🏛️' },
]

interface GoogleSearchBarProps {
  /** Texte du placeholder (« Rechercher ici... » par défaut). */
  placeholder?: string
  /** Valeur contrôlée du champ de recherche. */
  value?: string
  /** Appelé à chaque frappe dans le champ de recherche. */
  onChangeText?: (text: string) => void
  /** Appelé quand une catégorie est sélectionnée ou désélectionnée. */
  onCategorySelect?: (category: CategoryChip) => void
  /** Appelé quand l'avatar du profil est pressé. */
  onProfilePress?: () => void
  /** Thème sombre (inversion des couleurs). */
  isDark?: boolean
  /** Style personnalisé du conteneur. */
  style?: ViewStyle
}

export const GoogleSearchBar: React.FC<GoogleSearchBarProps> = ({
  placeholder = 'Rechercher ici...',
  value,
  onChangeText,
  onCategorySelect,
  onProfilePress,
  isDark = false,
  style,
}) => {
  // Id de la catégorie active (null = aucune)
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  // Toggle : re-cliquer sur la catégorie active la désélectionne
  const handleChipPress = (cat: CategoryChip) => {
    const next = selectedCategory === cat.id ? null : cat.id
    setSelectedCategory(next)
    onCategorySelect?.(cat)
  }

  // Palette de couleurs selon le thème clair / sombre
  const themeCardBg = isDark ? '#303134' : '#FFFFFF'
  const themeText = isDark ? '#E8EAED' : '#202124'
  const themeSubtext = isDark ? '#9AA0A6' : '#5F6368'
  const themeBorder = isDark ? '#3C4043' : '#E8EAED'

  return (
    <View style={[styles.container, style]}>
      {/* Carte du champ de recherche */}
      <View style={[styles.searchCard, { backgroundColor: themeCardBg, borderColor: themeBorder }]}>
        {/* Pastille du logo Google « G » */}
        <View style={styles.googleBadge}>
          <Text style={styles.googleGText}>G</Text>
        </View>

        {/* Champ de saisie contrôlé */}
        <TextInput
          style={[styles.input, { color: themeText }]}
          placeholder={placeholder}
          placeholderTextColor={themeSubtext}
          value={value}
          onChangeText={onChangeText}
        />

        {/* Actions à droite : micro + avatar du profil */}
        <View style={styles.rightActions}>
          <Pressable style={styles.iconBtn}>
            <Text style={styles.actionIcon}>🎙️</Text>
          </Pressable>
          <Pressable
            style={[styles.avatarBtn, { backgroundColor: isDark ? '#8AB4F8' : '#1A73E8' }]}
            onPress={onProfilePress}
          >
            <Text style={styles.avatarText}>M</Text>
          </Pressable>
        </View>
      </View>

      {/* Pastilles de catégories (défilement horizontal) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {GOOGLE_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                { backgroundColor: themeCardBg, borderColor: themeBorder },
                isActive && styles.chipActive,
              ]}
              onPress={() => handleChipPress(cat)}
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  { color: themeSubtext },
                  isActive && styles.chipLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // Conteneur flottant en haut de l'écran (sous la barre de statut)
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 38,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  // Carte arrondie du champ de recherche (ombre portée)
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 0.5,
  },
  // Pastille du logo G (cercle bleu Google)
  googleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  // Lettre « G » blanche dans la pastille
  googleGText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif-black',
  },
  // Champ de saisie (remplit l'espace restant)
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    height: '100%',
  },
  // Groupe des actions droite (micro + avatar)
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Bouton micro
  iconBtn: {
    padding: 6,
  },
  // Icône du micro
  actionIcon: {
    fontSize: 18,
  },
  // Avatar circulaire du profil
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Initiale de l'avatar
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Conteneur du défilement horizontal des pastilles
  chipScroll: {
    paddingTop: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  // Pastille de catégorie
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 6,
  },
  // Pastille active (sélectionnée)
  chipActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1A73E8',
  },
  // Icône de la pastille
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  // Étiquette de la pastille
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Étiquette quand la pastille est active
  chipLabelActive: {
    color: '#1A73E8',
    fontWeight: '700',
  },
})
