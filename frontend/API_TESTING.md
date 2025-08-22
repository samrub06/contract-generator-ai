# Guide de Test des Routes API

## Comment changer la route pour tester côté client

### 1. Modifier le fichier de configuration
Ouvrez `frontend/src/config/api.ts` et changez :

```typescript
// Pour tester la route normale
BASE_URL: 'http://localhost:3001'
ENDPOINTS.CONTRACT: '/api/contract'

// Pour tester une route mock
BASE_URL: 'http://localhost:3001'
ENDPOINTS.CONTRACT: '/api/contract/mock'

// Pour tester une autre API
BASE_URL: 'https://your-other-api.com'
ENDPOINTS.CONTRACT: '/api/contract'
```

### 2. Redémarrer le frontend
Après modification, redémarrez votre serveur de développement :
```bash
cd frontend
npm run dev
```

### 3. Tester
Votre frontend utilisera automatiquement la nouvelle route configurée.

## Routes disponibles dans votre backend
- `/api/contract` - Génération de contrat normale
- `/api/contract/mock` - Route mock (à créer si nécessaire)
- `/api/health` - Vérification de santé

## Avantages de cette approche
- ✅ Pas de code mock complexe
- ✅ Changement de route en une ligne
- ✅ Configuration centralisée
- ✅ Facile à maintenir 