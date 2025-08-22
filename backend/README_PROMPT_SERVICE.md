# Prompt Contract Service

Service simple pour préparer des prompts optimisés pour OpenAI afin de générer des contrats section par section.

## 🎯 Objectif

- **Prendre le prompt utilisateur** du client
- **Préparer un prompt optimisé** pour OpenAI
- **Utiliser le format compact** (S:, SS:, C:) pour économiser les tokens
- **Générer section par section** sans analyse préalable

## 📋 Format Compact

```
S: [Section Title]
SS: [Subsection Number and Title] (if applicable)
C: [Content]
```

**Exemples :**
- `S: ACCOUNT INFORMATION; SHARING`
- `SS: 1.1 Registration; Username and Passwords`
- `C: You may be required to provide information...`
- `Use (i), (ii), (iii) for lists`

## 🚀 Utilisation

### 1. Initialisation
```javascript
const PromptContractService = require('./services/promptContractService');
const promptService = new PromptContractService();
```

### 2. Préparer un prompt pour la structure du contrat
```javascript
const userPrompt = "Generate a SaaS Terms of Service contract for a cybersecurity company";
const contractPrompt = promptService.prepareContractPrompt(userPrompt);
```

### 3. Préparer un prompt pour une section spécifique
```javascript
const sectionPrompt = promptService.prepareSectionPrompt(
  userPrompt, 
  'ACCOUNT INFORMATION; SHARING',
  { businessType: 'cybersecurity', location: 'New York' }
);
```

### 4. Préparer un prompt pour une sous-section
```javascript
const subsectionPrompt = promptService.prepareSubsectionPrompt(
  userPrompt,
  'ACCOUNT INFORMATION; SHARING',
  '1.1 Registration; Username and Passwords',
  { businessType: 'cybersecurity' }
);
```

## 🔧 Fonctionnalités

- **Validation des prompts** : Vérifie que le prompt n'est pas vide et ne dépasse pas 4000 caractères
- **Estimation des tokens** : Calcule approximativement le nombre de tokens utilisés
- **Format optimisé** : Instructions claires pour OpenAI pour minimiser la verbosité
- **Contexte flexible** : Permet d'ajouter du contexte métier spécifique

## 📊 Exemple de Sortie

**Prompt pour la structure :**
```
You are a legal contract generator. Generate contracts section by section using this compact format to save tokens:

FORMAT:
S: [Section Title]
SS: [Subsection Number and Title] (if applicable)
C: [Content]

Use (i), (ii), (iii) for lists and bullet points.
Keep content concise but legally comprehensive.
Generate one section at a time when requested.

USER REQUEST: Generate a SaaS Terms of Service contract for a cybersecurity company

GENERATE: Complete contract structure with sections and subsections.

Provide the structure first, then we'll generate each section individually.
```

## 💡 Avantages

1. **Économie de tokens** : Format compact et instructions claires
2. **Simplicité** : Pas d'analyse complexe, juste la préparation du prompt
3. **Flexibilité** : Adaptable à différents types de contrats
4. **Validation** : Vérifications de base pour éviter les erreurs
5. **Réutilisabilité** : Peut être utilisé dans différents contextes

## 🔄 Flux de Travail

1. **Client** envoie son prompt utilisateur
2. **PromptContractService** prépare le prompt optimisé
3. **OpenAI** reçoit le prompt structuré et génère le contenu
4. **Résultat** est au format compact (S:, SS:, C:)
5. **HTMLFormatter** convertit le format compact en HTML

## 📝 Notes

- L'IA fait l'analyse elle-même, pas de traitement préalable
- Format optimisé pour économiser les tokens OpenAI
- Structure hiérarchique claire avec sections et sous-sections
- Utilisation de (i), (ii), (iii) pour les listes numérotées 