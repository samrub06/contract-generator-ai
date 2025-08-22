# Contract Generator Backend - Structure Simplifiée

## 🏗️ Structure du projet

```
backend/
├── index.js              # Serveur principal
├── routes/
│   └── contract.js       # 2 routes simples
├── services/
│   ├── mockService.js    # Service Mock
│   └── openaiService.js  # Service OpenAI
├── middlewares/
│   └── validation.js     # Validation des requêtes
└── package.json
```

## 🚀 Routes disponibles

### 1. **Service Mock** (par défaut)
```
POST /api/contract
```
- Génère des contrats sans OpenAI
- Réponse en streaming SSE
- Contrats simples et rapides

### 2. **Service OpenAI**
```
POST /api/contract/openai
```
- Génère des contrats avec IA
- Réponse en streaming SSE
- Contrats plus sophistiqués

## 📝 Format des requêtes

```json
{
  "prompt": "Generate terms of service for a SaaS company"
}
```

## 🔧 Démarrage

```bash
# Installation
npm install

# Démarrage
npm start

# Développement
npm run dev
```

## ✨ Avantages de cette structure

✅ **Simple** - 2 routes, 2 services, c'est tout !  
✅ **Claire** - Chaque fichier a un rôle précis  
✅ **Maintenable** - Code facile à comprendre et modifier  
✅ **Professionnelle** - Structure en dossiers respectant les bonnes pratiques  
✅ **Testable** - Services séparés et indépendants  

## 🔄 Streaming SSE

Les deux services utilisent le même format de streaming :
- `structure` - Structure du contrat
- `generating` - Début de génération HTML
- `html_chunk` - Morceaux d'HTML avec progression
- `complete` - Génération terminée
- `error` - Erreur éventuelle 