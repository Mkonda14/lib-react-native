/**
 * GoogleSearchBar — barre de recherche et filtres style Google Maps
 * ==================================================================
 * Barre flottante en haut de la carte, avec :
 *  - Champ de recherche arrondi avec badge « G » et bouton micro
 *  - Avatar du profil (appel onProfilePress)
 *  - Pastilles de catégories horizontales (restaurants, essence, etc.)
 *
 * Mode focus (inspiré de Google Maps) :
 *  - Au focus du champ, une surface opaque « envahit » tout l'écran
 *    (Modal + push Reanimated depuis la droite) comme un changement
 *    d'écran ; la carte de recherche est re-clonée aux mêmes
 *    coordonnées (elle semble immobile), badge « G » → « ← » (retour),
 *    avatar masqué, bouton « × » d'effacement si texte.
 *  - Sous la barre, un slot basse injectable (`focusedContent`) reçoit
 *    le contenu demandé par l'usage : liste de suggestions, recherches
 *    récentes, actions… au choix du parent (ReactNode ou render-prop
 *    recevant { query, close, isDark }).
 *
 * Composant contrôlé par le parent via value / onChangeText ; en usage
 * non contrôlé (value omis) un état interne fait foi, partagé par les
 * deux champs (inline + overlay).
 */

import * as React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/* Reanimated : les shared values (.value) sont conçues pour être mutées —
   règle react-hooks/immutability désactivée (même choix que bottom-sheet.tsx). */
/* eslint-disable react-hooks/immutability */

/** Catégorie de recherche affichée sous forme de pastille. */
export interface CategoryChip {
  id: string;
  label: string;
  icon: string;
}

/** Liste des catégories par défaut (icônes emoji). */
export const GOOGLE_CATEGORIES: CategoryChip[] = [
  { id: "restaurants", label: "Restaurants", icon: "🍕" },
  { id: "gas", label: "Essence", icon: "⛽" },
  { id: "groceries", label: "Courses", icon: "🛒" },
  { id: "coffee", label: "Café", icon: "☕" },
  { id: "hotels", label: "Hôtels", icon: "🏨" },
  { id: "pharmacy", label: "Pharmacie", icon: "💊" },
  { id: "attractions", label: "Monuments", icon: "🏛️" },
];

/** Contexte passé au render-prop `focusedContent`. */
export interface GoogleSearchBarFocusContext {
  /** Texte courant de la recherche. */
  query: string;
  /** Ferme l'overlay de recherche (animation de sortie). */
  close: () => void;
  /** Thème sombre actif. */
  isDark: boolean;
}

export interface GoogleSearchBarProps {
  /** Texte du placeholder (« Rechercher ici... » par défaut). */
  placeholder?: string;
  /** Valeur contrôlée du champ de recherche. */
  value?: string;
  /** Appelé à chaque frappe dans le champ de recherche. */
  onChangeText?: (text: string) => void;
  /** Appelé quand une catégorie est sélectionnée ou désélectionnée. */
  onCategorySelect?: (category: CategoryChip) => void;
  /** Appelé quand l'avatar du profil est pressé. */
  onProfilePress?: () => void;
  /** Thème sombre (inversion des couleurs). */
  isDark?: boolean;
  /** Style personnalisé du conteneur. */
  style?: ViewStyle;
  /**
   * Contenu injectable dans la zone basse de l'overlay de recherche
   * (mode focus). ReactNode, ou render-prop reçu { query, close, isDark }.
   */
  focusedContent?:
    React.ReactNode | ((ctx: GoogleSearchBarFocusContext) => React.ReactNode);
  /** Notifie l'ouverture (true) / la fermeture (false) du mode focus. */
  onFocusedChange?: (focused: boolean) => void;
  /** Auto-focus du champ dans l'overlay à l'ouverture (défaut : true). */
  autoFocus?: boolean;
}

/** Décalage haut de la barre (sous la barre de statut). */
const BAR_TOP = Platform.OS === "ios" ? 54 : 38;
/** Hauteur de la carte + marge : début de la zone de slot dans l'overlay. */
const SLOT_TOP = BAR_TOP + 62;

export const GoogleSearchBar: React.FC<GoogleSearchBarProps> = ({
  placeholder = "Rechercher ici...",
  value,
  onChangeText,
  onCategorySelect,
  onProfilePress,
  isDark = false,
  style,
  focusedContent,
  onFocusedChange,
  autoFocus = true,
}) => {
  // Id de la catégorie active (null = aucune)
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );

  // ---- Mode focus (overlay plein écran) ----------------------------------
  const [overlayVisible, setOverlayVisible] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [internalText, setInternalText] = React.useState("");
  // Contrôlé si `value` fourni, sinon état interne — les deux inputs
  // (inline + overlay) lisent la même source.
  const text = value !== undefined ? value : internalText;
  const progress = useSharedValue(0);
  const inputRef = React.useRef<TextInput>(null);
  const overlayInputRef = React.useRef<TextInput>(null);
  const { width: screenWidth } = useWindowDimensions();

  const themeCardBg = isDark ? "#303134" : "#FFFFFF";
  const themeText = isDark ? "#E8EAED" : "#202124";
  const themeSubtext = isDark ? "#9AA0A6" : "#5F6368";
  const themeBorder = isDark ? "#3C4043" : "#E8EAED";
  const themeSurface = isDark ? "#202124" : "#FFFFFF";

  const handleChangeText = (next: string) => {
    if (value === undefined) setInternalText(next);
    onChangeText?.(next);
  };

  const finishClose = React.useCallback(() => {
    setClosing(false);
    setOverlayVisible(false);
    onFocusedChange?.(false);
    // La restoration du focus Android à la sortie du dialog peut repointer
    // l'input inline et rouvrir le clavier : on re-blarre après démontage.
    const settle = () => {
      inputRef.current?.blur();
      Keyboard.dismiss();
    };
    settle();
    setTimeout(settle, 250);
  }, [onFocusedChange]);

  // Demande de fermeture : purement état (aucune lecture de ref) — peut
  // être passée au render-prop focusedContent sans blesser react-hooks/refs.
  const close = React.useCallback(() => {
    if (!overlayVisible || closing) return;
    setClosing(true);
  }, [overlayVisible, closing]);

  // Retour Android en mode focus : consommé en JS AVANT react-navigation
  // (inscription postérieure → listener LIFO → prioritaire), pour fermer
  // l'overlay sans faire revenir l'écran/onglet précédent.
  React.useEffect(() => {
    if (!overlayVisible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [overlayVisible, close]);

  // Fermeture effective : blur (évite la ré-ouverture par restauration du
  // focus à la sortie du Modal) + animation de sortie, puis démontage.
  React.useEffect(() => {
    if (!closing) return;
    inputRef.current?.blur();
    overlayInputRef.current?.blur();
    Keyboard.dismiss();
    progress.value = withTiming(
      0,
      { duration: 200, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
  }, [closing, finishClose, progress]);

  const open = () => {
    if (overlayVisible || closing) return;
    setOverlayVisible(true);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    // Blur AVANT l'attachement du dialog : il ne mémorisera alors aucun
    // focus à restaurer à la fermeture (sinon l'input inline reprend le
    // focus et le clavier rouvre).
    inputRef.current?.blur();
    onFocusedChange?.(true);
  };

  const handleOverlayShow = () => {
    if (autoFocus) overlayInputRef.current?.focus();
  };

  const handleClear = () => {
    handleChangeText("");
    overlayInputRef.current?.focus();
  };

  const overlayAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [screenWidth, 0]) },
    ],
  }));

  // Toggle : re-cliquer sur la catégorie active la désélectionne
  const handleChipPress = (cat: CategoryChip) => {
    const next = selectedCategory === cat.id ? null : cat.id;
    setSelectedCategory(next);
    onCategorySelect?.(cat);
  };

  /**
   * Carte de recherche partagée entre la barre inline et l'overlay
   * (mêmes dimensions → clone aligné au pixel près).
   */
  const renderCard = (mode: "inline" | "overlay") => (
    <View
      style={[
        styles.searchCard,
        { backgroundColor: themeCardBg, borderColor: themeBorder },
      ]}
    >
      {mode === "inline" ? (
        // Pastille du logo Google « G »
        <View style={styles.googleBadge}>
          <Text style={styles.googleGText}>O</Text>
        </View>
      ) : (
        // Retour (mode focus) : referme l'overlay
        <Pressable
          style={styles.backBtn}
          onPress={close}
          accessibilityLabel="Fermer la recherche"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={[styles.backArrow, { color: themeText }]}>←</Text>
        </Pressable>
      )}

      {/* Champ de saisie contrôlé */}
      <TextInput
        ref={mode === "overlay" ? overlayInputRef : inputRef}
        style={[styles.input, { color: themeText }]}
        placeholder={placeholder}
        placeholderTextColor={themeSubtext}
        value={text}
        onChangeText={handleChangeText}
        onFocus={mode === "inline" ? open : undefined}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />

      {mode === "overlay" ? (
        text.length > 0 ? (
          // Effacement rapide (mode focus)
          <Pressable
            style={styles.clearBtn}
            onPress={handleClear}
            accessibilityLabel="Effacer la recherche"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[styles.clearGlyph, { color: themeSubtext }]}>×</Text>
          </Pressable>
        ) : null
      ) : null}
    </View>
  );

  return (
    <>
      {/* Barre au repos (position d'origine) */}
      <View style={[styles.container, style]}>
        {renderCard("inline")}

        {/* Pastilles de catégories (défilement horizontal) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {GOOGLE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
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
            );
          })}
        </ScrollView>
      </View>

      {/* Overlay plein écran (mode focus) */}
      {overlayVisible && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={close}
          onShow={handleOverlayShow}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: themeSurface },
              overlayAnimStyle,
            ]}
          >
            {/* Clone de la barre : mêmes coordonnées que l'inline */}
            <View style={[styles.container, style]}>
              {renderCard("overlay")}
            </View>

            {/* Zone basse injectable (contenu du parent) — la fenêtre du
                Modal n'est pas redimensionnée par le clavier Android :
                compensation explicite via padding. */}
            <KeyboardAvoidingView behavior="padding" style={styles.overlayBody}>
              <View style={styles.overlaySlot} pointerEvents="box-none">
                {typeof focusedContent === "function"
                  ? focusedContent({ query: text, close, isDark })
                  : focusedContent}
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Conteneur flottant en haut de l'écran (sous la barre de statut)
  container: {
    position: "absolute",
    top: BAR_TOP,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  // Carte arrondie du champ de recherche (ombre portée)
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 6,
    paddingHorizontal: 14,
    shadowColor: "#000",
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
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  // Lettre « G » blanche dans la pastille
  googleGText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif-black",
  },
  // Bouton retour (overlay) — même emprise que la pastille G
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 6,
  },
  // Flèche de retour
  backArrow: {
    fontSize: 20,
    fontWeight: "600",
  },
  // Bouton d'effacement (overlay)
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  // Glyphe « × »
  clearGlyph: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  // Champ de saisie (remplit l'espace restant)
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    height: "100%",
  },
  // Groupe des actions droite (micro + avatar)
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  // Initiale de l'avatar
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 6,
  },
  // Pastille active (sélectionnée)
  chipActive: {
    backgroundColor: "#E8F0FE",
    borderColor: "#1A73E8",
  },
  // Icône de la pastille
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  // Étiquette de la pastille
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Étiquette quand la pastille est active
  chipLabelActive: {
    color: "#1A73E8",
    fontWeight: "700",
  },
  // Corps de l'overlay sous la barre clonée
  overlayBody: {
    flex: 1,
    marginTop: SLOT_TOP,
  },
  // Zone basse ancrée (contenu injecté par le parent)
  overlaySlot: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
