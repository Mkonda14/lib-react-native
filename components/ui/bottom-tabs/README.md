# Bottom Tabs Component Library 🚀

Une bibliothèque de navigation inférieure (**Bottom Tab Bar**) ultra-complète, fluide, hyper-optimisée et personnalisable pour **React Native**, **Expo Router** et **NativeWind**.

---

## 🌟 Fonctionnalités Principales

- 📱 **Ajustement Universel (Peu Importe Le Téléphone)** : Prise en charge native de la zone de sécurité (iOS Home Indicator, encoches, Dynamic Island, gestes Android) sans chevauchement ni double-margin.
- 🎨 **6 Presets Visuels Sublimes** :
  - `ios` : Rendu classique iOS avec flou d'arrière-plan, séparateur supérieur et micro-ressort.
  - `material` : Design Material 3 avec pilule d'activation fluide.
  - `pill` : Capsule sombre/claire flottante avec étiquette extensible (morphing).
  - `minimal` : Style épuré minimaliste avec indicateur sous forme de point dynamique.
  - `glass` : Effet Glassmorphism avec dégradé translucide et lueur d'activation.
  - `dock` : Inspiré du Dock macOS avec rebond élastique sur sélection (`activeScale: 1.28`).
- ⚡ **Animations Reanimated 4 Ultra Fluides** : Retour tactile sur pression (scale `0.92`), physique de ressorts élastiques, transitions de couleurs et de badges sans perte de FPS.
- 🔌 **Adaptateur Expo Router Prêt à l'Emploi** : Intégration en une seule ligne via `<BottomTabBarAdapter />`.
- 📳 **Retours Haptiques & Accessibilité** : Rendu ARIA complet, support font scaling et Haptics (`expo-haptics`).

---

## 📦 Installation & Utilisation

### 1. Utilisation Directe (Composant Autonome)

```tsx
import React, { useState } from 'react'
import { View } from 'react-native'
import { BottomTabBar } from '@/components/ui/bottom-tabs'
import { Home, Search, Bell, User } from 'lucide-react-native'

export function MyScreen() {
  const [active, setActive] = useState(0)

  return (
    <View style={{ flex: 1 }}>
      {/* Contenu principal */}

      <BottomTabBar
        preset="glass"
        activeIndex={active}
        onTabChange={(index) => setActive(index)}
        tabs={[
          { id: 'home', label: 'Accueil', icon: <Home size={22} /> },
          { id: 'search', label: 'Recherche', icon: <Search size={22} /> },
          { id: 'notifs', label: 'Alertes', icon: <Bell size={22} />, badge: { variant: 'count', count: 4 } },
          { id: 'profile', label: 'Profil', icon: <User size={22} /> },
        ]}
      />
    </View>
  )
}
```

### 2. Intégration Expo Router (`app/(tabs)/_layout.tsx`)

```tsx
import { Tabs } from 'expo-router'
import { BottomTabBarAdapter } from '@/components/ui/bottom-tabs'
import { Home, Search, User } from 'lucide-react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBarAdapter {...props} preset="pill" />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
```

---

## 🎨 Presets Disponibles

| Preset | Description |
| :--- | :--- |
| **`ios`** | Style natif iOS avec flou dynamique et bordure supérieure fine. |
| **`material`** | Style Android Material 3 avec pilule de fond derrière l'icône active. |
| **`pill`** | Capsule flottante moderne où l'onglet actif s'étire pour afficher l'étiquette. |
| **`minimal`** | Icônes seules sans texte avec un point indicateur animé sous l'onglet actif. |
| **`glass`** | Rendu moderne glassmorphism avec transparence et lueur d'arrière-plan. |
| **`dock`** | Inspiré du macOS Dock avec effet de rebond dynamique sur les icônes. |