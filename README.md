# Rencontres par équipes FFT

Ce projet est un explorateur des rencontres du Championnat de France interclubs de tennis (Messieurs, Nationales 1 à 4) se déroulant en région Île-de-France.

## Fonctionnalités

- **Extraction de données (Scraping)** : Récupération automatisée des informations de rencontres depuis la plateforme TenUp.
- **Filtrage Avancé** : Filtrez les rencontres par division (Nationale 1, 2, 3 ou 4) et par date.
- **Localisation** : Calculez la distance entre votre position (via une adresse ou un code postal) et le lieu de la rencontre.
- **Focus Île-de-France** : Identification automatique des matchs se déroulant en IDF.
- **Liens directs** : Accès direct aux feuilles de match officielles sur TenUp.

## Installation

Tout d'abord, installez les dépendances :

```bash
npm install
```

Ensuite, lancez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir le résultat.

## Utilisation

1. **Lancer le recensement** : Dans l'interface, ouvrez la section "Analyse" pour démarrer le scraping des divisions souhaitées.
2. **Rechercher** : Utilisez les filtres de division et de date pour trouver des rencontres spécifiques.
3. **Géolocalisation** : Saisissez votre code postal pour voir les rencontres les plus proches de chez vous.

## Technologies utilisées

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **API Adresse (data.gouv.fr)** pour la géolocalisation
- **Puppeteer** (via les scripts de test) pour l'extraction de données

## Développement

Le projet contient plusieurs scripts utilitaires pour le scraping :
- `backfill.js` : Pour remplir la base de données initiale.
- `scraper-test*.js` : Scripts de test pour les différentes étapes de l'extraction.

## Déploiement sur Google Cloud Run

Pour déployer cette application sur Google Cloud Run :

1. Assurez-vous d'avoir le [SDK Google Cloud](https://cloud.google.com/sdk) installé et configuré.
2. Exécutez la commande suivante à la racine du projet :

```bash
gcloud run deploy --source .
```

3. Suivez les instructions pour choisir la région et autoriser les appels non authentifiés si nécessaire.
