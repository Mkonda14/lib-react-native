# MakutaShare 💰

MakutaShare est une application de gestion financière familiale et multi-locataire. Conçue initialement pour permettre à un chef de famille (Manager) de distribuer, suivre et gérer les dépenses de ses proches (Membres) via un système de portefeuilles virtuels (enveloppes) et d'approbations de fonds.

## ✨ Fonctionnalités Principales

*   **Gestion Multi-Portefeuilles :** Le Manager possède un solde global et alloue des fonds dans des sous-portefeuilles spécifiques pour chaque membre (ex: Transport, Frais académiques, Nourriture).
*   **Flux d'Approbation :** Les membres peuvent émettre des demandes de fonds (Transactions "PENDING") que le Manager peut approuver ou rejeter depuis son tableau de bord.
*   **Séparation des Rôles :** Interface et droits distincts entre le `MANAGER` (qui invite et finance) et le `MEMBER` (qui dépense et demande).
*   **Historique et Traçabilité :** Suivi détaillé de chaque mouvement financier (Dépôt, Retrait, Transfert).

*(À venir : Mode hors-ligne avec WatermelonDB et intégration des paiements Mobile Money via pawaPay/FlexPay).*

## 🛠️ Stack Technique

Ce projet est divisé en deux parties principales : une application mobile (Frontend) et une API (Backend).

### Application Mobile (Frontend)
*   **Framework :** React Native avec [Expo](https://expo.dev/)
*   **Langage :** TypeScript
*   **Gestionnaire de paquets :** Yarn (recommandé pour la stabilité réseau)
*   **UI/Composants :** NativeWind / StyleSheet

### API & Base de données (Backend)
*   **Framework :** [Next.js](https://nextjs.org/) (App Router / API Routes)
*   **Langage :** TypeScript
*   **Base de données :** PostgreSQL ou MySQL
*   **ORM :** [Prisma](https://www.prisma.io/)
*   **Authentification :** [Better Auth](https://better-auth.com/)

---

## 🚀 Installation et Lancement

### 1. Prérequis
Assurez-vous d'avoir installé sur votre machine :
*   Node.js (v18+)
*   Yarn (`npm install -g yarn`)
*   L'application **Expo Go** sur votre téléphone (Android/iOS) ou un émulateur configuré.

### 2. Configuration du Back-end (Next.js)

#### Prebuild peut être utilisé en tapant: 

```bash
npx expo prebuild
```

Pour générer les dossiers natifs (android, ios) et d'autres fichiers de configuration.  

#### Utilisation avancée

Si vous voulez prébuilder uniquement pour iOS, android ou aucun : 

```bash
npx expo prebuild --platform ios # ios
npx expo prebuild --platform android # android
npx expo prebuild --platform none # aucun
```

##### Utilisation avec les commandes d'exécution Expo CLI

Vous pouvez effectuer une construction native localement en exécutant : 

```bash
npx expo run:android
npx expo run:ios
```

## Démarrer l'application

Pour démarrer l'application, vous pouvez utiliser la commande suivante : 

```bash 
npx expo start
```

#### Nettoyage du projet

Parfois il peut arriver que des fichiers ne soient pas supprimés, vous pouvez les supprimer manuellement en tapant la commande suivante :

```bash
npx expo reset-project
```