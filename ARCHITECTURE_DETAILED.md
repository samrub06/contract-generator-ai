# Architecture Détaillée - Contract Generator AI

## 🏗️ Diagramme d'Architecture Complet

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[HomePage.tsx]
        API_Client[htmlService.ts]
        Layout[Layout.tsx]
    end

    subgraph "Backend Layer"
        subgraph "API Routes"
            Routes[contract.js]
            Health[Health Check]
        end

        subgraph "Services Layer"
            Streaming[streamingService.js]
            OpenAI[openaiService.js]
            Prompt[promptService.js]
            HTML[htmlFormatter.js]
        end

        subgraph "Middleware"
            RateLimit[rateLimiter.js]
        end
    end

    subgraph "External Services"
        OpenAI_API[OpenAI GPT-4o-mini]
    end

    subgraph "Data Flow"
        User_Input[User Prompt]
        Session_State[Session State]
        Generated_HTML[Generated HTML]
    end

    %% Frontend connections
    UI --> API_Client
    API_Client --> Layout

    %% API connections
    API_Client --> Routes
    Routes --> Health

    %% Route to Services
    Routes --> Streaming
    Routes --> RateLimit

    %% Service connections
    Streaming --> OpenAI
    Streaming --> Prompt
    Streaming --> HTML

    %% OpenAI connection
    OpenAI --> OpenAI_API

    %% Data flow
    User_Input --> UI
    UI --> Session_State
    Streaming --> Session_State
    HTML --> Generated_HTML
    Generated_HTML --> UI

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class UI,API_Client,Layout frontend
    class Routes,Health,RateLimit backend
    class Streaming,OpenAI,Prompt,HTML service
    class OpenAI_API external
    class User_Input,Session_State,Generated_HTML data
```

## 🔄 Flux de Données Détaillé

### 1. **Démarrage de la Génération**
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant O as OpenAI

    U->>F: Saisie du prompt
    F->>B: POST /tos/start
    B->>B: Création de session
    B->>O: Génération première section
    O->>B: Section générée
    B->>B: Formatage HTML
    B->>F: Réponse avec section
    F->>U: Affichage première section
```

### 2. **Génération des Sections Suivantes**
```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant O as OpenAI

    loop Génération automatique
        F->>B: POST /tos/next
        B->>O: Génération section suivante
        O->>B: Section générée
        B->>B: Formatage HTML
        B->>F: Réponse avec section
        F->>F: Mise à jour affichage
    end
```

### 3. **Arrêt de la Génération**
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend

    U->>F: Clic sur Stop
    F->>B: POST /tos/stop
    B->>B: Arrêt de la session
    B->>F: Confirmation arrêt
    F->>U: Affichage statut arrêté
```

## 🎯 Responsabilités Détaillées

### **Frontend (React + TypeScript)**

#### HomePage.tsx
- **État Local** : Gestion du prompt, statut de génération, sections générées
- **Logique Métier** : Orchestration de la génération automatique
- **Interface Utilisateur** : Formulaires, boutons, affichage des sections
- **Gestion des Erreurs** : Affichage des erreurs et messages de statut

#### htmlService.ts
- **Client HTTP** : Appels aux endpoints backend
- **Typage** : Interfaces TypeScript pour les réponses API
- **Gestion des Erreurs** : Transformation des erreurs HTTP

### **Backend (Node.js + Express)**

#### streamingService.js - Orchestrateur Principal
```javascript
// Responsabilités clés
class ToSStreamingService {
  // 1. Gestion des sessions
  activeSessions: Map<string, Session>
  
  // 2. Orchestration de la génération
  startGeneration(userPrompt, sessionId)
  generateNextSection(sessionId)
  stopGeneration(sessionId)
  
  // 3. Nettoyage automatique
  cleanupExpiredSessions(maxAgeHours)
}
```

#### openaiService.js - Interface OpenAI
```javascript
// Responsabilités clés
- Communication avec l'API OpenAI
- Validation des réponses avec Zod
- Gestion des erreurs d'API
- Optimisation des tokens
```

#### promptService.js - Générateur de Prompts
```javascript
// Responsabilités clés
- Génération de prompts structurés
- Optimisation des tokens
- Formatage JSON requis
- Gestion des sections multiples
```

#### htmlFormatter.js - Formateur HTML
```javascript
// Responsabilités clés
- Conversion des sections en HTML
- Gestion des sous-sections
- Formatage des listes numérotées
- Structure HTML cohérente
```

## 🔧 Points Techniques Clés

### 1. **Gestion des Sessions**
- Sessions stockées en mémoire (Map)
- Nettoyage automatique toutes les heures
- Statut persistant pendant la génération

### 2. **Génération Séquentielle**
- Sections générées une par une
- Contrôle de la progression
- Possibilité d'arrêt à tout moment

### 3. **Optimisation des Coûts**
- Utilisation de GPT-4o-mini (moins cher)
- Prompts optimisés pour réduire les tokens
- Validation des réponses pour éviter les régénérations

### 4. **Sécurité**
- Rate limiting sur tous les endpoints
- Validation des entrées
- Sanitisation HTML avec DOMPurify

## 📊 Métriques de Performance

### **Backend**
- Temps de réponse API : < 200ms
- Gestion de sessions : Jusqu'à 1000 sessions simultanées
- Nettoyage automatique : Toutes les heures

### **Frontend**
- Temps de rendu : < 100ms
- Mise à jour en temps réel : 300ms entre sections
- Interface responsive : Mobile-first design

## 🚀 Évolutions Futures

### **Court Terme**
- Cache Redis pour les sessions
- Logs structurés
- Métriques de performance

### **Moyen Terme**
- Support multi-langues
- Templates de contrats
- Export PDF

### **Long Terme**
- IA spécialisée par domaine juridique
- Validation légale automatisée
- Intégration avec des bases de données juridiques 