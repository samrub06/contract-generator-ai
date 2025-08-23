# Architecture Globale - Contract Generator AI

## Vue d'ensemble
Application de génération de contrats et conditions d'utilisation avec **génération en temps réel par chunks de 4 sections** pour optimiser les coûts et améliorer les performances.

## Architecture Backend

### 🏗️ Structure des Services

```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Routes (contract.js)                                          │
│  ├── POST /tos/start    - Démarrer la génération (chunk 1-4)  │
│  ├── POST /tos/next     - Générer le chunk suivant (5-8, 9-10)│
│  └── POST /tos/stop     - Arrêter la génération               │
├─────────────────────────────────────────────────────────────────┤
│  Services Layer                                                │
│  ├── streamingService.js    - Orchestration des chunks        │
│  ├── openaiService.js       - Communication avec OpenAI       │
│  ├── promptService.js       - Génération des prompts chunks   │
│  ├── htmlFormatter.js       - Formatage HTML des chunks       │
│  └── rateLimiter.js         - Limitation de débit             │
├─────────────────────────────────────────────────────────────────┤
│  Middleware Layer                                             │
│  ├── rateLimiter.js         - Contrôle du débit               │
└─────────────────────────────────────────────────────────────────┘
```

### 🔧 Responsabilités des Services

#### 1. **streamingService.js** - Orchestrateur Principal des Chunks
- **Responsabilité** : Gestion des sessions de génération par chunks
- **Fonctions** :
  - Création et suivi des sessions actives
  - Génération de chunks de 4 sections
  - Gestion de la progression par chunks
  - Nettoyage automatique des sessions expirées
  - **Nouveau** : Optimisation des coûts avec chunks de 4 sections

#### 2. **openaiService.js** - Interface OpenAI
- **Responsabilité** : Communication avec l'API OpenAI
- **Fonctions** :
  - Génération de chunks via GPT-4o-mini
  - Validation des réponses avec Zod (4 sections)
  - Gestion des erreurs d'API
  - **Nouveau** : Traitement de chunks multiples

#### 3. **promptService.js** - Générateur de Prompts Chunks
- **Responsabilité** : Création de prompts optimisés pour chunks
- **Fonctions** :
  - Génération de prompts pour 4 sections consécutives
  - Optimisation des tokens pour chunks
  - Formatage JSON requis pour chunks
  - **Nouveau** : Focus sur la cohérence entre sections

#### 4. **htmlFormatter.js** - Formateur HTML des Chunks
- **Responsabilité** : Conversion des chunks en HTML
- **Fonctions** :
  - Formatage des chunks de 4 sections
  - Gestion des sous-sections multiples
  - Formatage des listes numérotées
  - **Nouveau** : Structure HTML cohérente par chunk

#### 5. **rateLimiter.js** - Contrôle du Débit
- **Responsabilité** : Limitation des requêtes
- **Fonctions** :
  - Contrôle du nombre de requêtes par utilisateur
  - Protection contre le spam
  - **Nouveau** : Optimisé pour moins de requêtes (chunks)

## Architecture Frontend

### 🎨 Structure des Composants

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx                                                       │
│  ├── Router configuration                                      │
│  └── Layout wrapper                                            │
├─────────────────────────────────────────────────────────────────┤
│  Pages Layer                                                   │
│  ├── HomePage.tsx             - Interface chunks              │
│  └── Layout.tsx               - Structure de la page          │
├─────────────────────────────────────────────────────────────────┤
│  Services Layer                                                │
│  ├── htmlService.ts           - API client chunks             │
│  └── api.ts                   - Configuration API              │
└─────────────────────────────────────────────────────────────────┘
```

### 🔧 Responsabilités des Composants

#### 1. **HomePage.tsx** - Interface des Chunks
- **Responsabilité** : Gestion de la génération de contrats par chunks
- **Fonctions** :
  - Saisie du prompt utilisateur
  - Démarrage de la génération (chunk 1-4)
  - Affichage en temps réel des chunks
  - Gestion des états (génération, arrêt, erreur)
  - **Nouveau** : Affichage par chunks de 4 sections
  - Téléchargement du HTML final

#### 2. **htmlService.ts** - Client API Chunks
- **Responsabilité** : Communication avec le backend par chunks
- **Fonctions** :
  - Appels aux endpoints de génération de chunks
  - Gestion des réponses de chunks
  - **Nouveau** : Typage TypeScript pour chunks
  - Gestion des erreurs HTTP

## 🔄 Flux de Données - Système par Chunks

```
User Input → Frontend → Backend API → OpenAI → Backend Processing → Frontend Display
     ↓              ↓           ↓         ↓           ↓              ↓
  Prompt      HomePage    Routes    OpenAI    Services      Real-time
  Saisi       State      API       API       Processing    Chunk Updates
```

### **Nouveau Flux de Génération**
```
Chunk 1 (Sections 1-4) → Chunk 2 (Sections 5-8) → Chunk 3 (Sections 9-10)
         ↓                        ↓                        ↓
   1 API Call                1 API Call              1 API Call
   (4 sections)             (4 sections)            (2 sections)
```

## 🚀 Points Clés de l'Architecture

### 1. **Génération par Chunks de 4 Sections**
- Chunks générés en une seule fois
- Affichage progressif par chunks
- Possibilité d'arrêt à tout moment
- **Avantage** : 70% de réduction des coûts API

### 2. **Gestion des Sessions Optimisée**
- Sessions persistantes côté serveur
- Nettoyage automatique des sessions expirées
- Suivi de l'état de génération par chunks
- **Avantage** : Moins d'états intermédiaires

### 3. **Optimisation des Coûts**
- Utilisation de GPT-4o-mini (moins cher)
- Prompts optimisés pour chunks de 4 sections
- Validation des réponses pour éviter les régénérations
- **Avantage** : 3 appels API au lieu de 10

### 4. **Sécurité et Performance**
- Rate limiting pour éviter le spam
- Validation des entrées
- Gestion des erreurs robuste
- **Avantage** : Moins de requêtes = meilleure performance

## 🔧 Technologies Utilisées

- **Backend** : Node.js, Express.js
- **Frontend** : React, TypeScript, Tailwind CSS
- **AI** : OpenAI GPT-4o-mini
- **Validation** : Zod
- **Sécurité** : DOMPurify, Rate Limiting
- **Build** : Vite, ESLint

## 📊 Métriques de Performance

### **Avant (Sections Individuelles)**
- 10 appels API pour 10 sections
- Latence : 10 × temps API
- Coût : 10 × coût par section

### **Maintenant (Chunks de 4 Sections)**
- 3 appels API pour 10 sections
- Latence : 3 × temps API
- Coût : 3 × coût par chunk
- **Amélioration** : 70% de réduction des coûts et de la latence 