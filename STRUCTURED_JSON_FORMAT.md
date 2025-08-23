# Format JSON Structuré - Contract Generator AI

## 🎯 **Vue d'ensemble**

Le système génère maintenant des **Terms of Service en format JSON structuré**, similaire aux exemples de **Perplexity** et **Zoom**, avec un **streaming en temps réel** caractère par caractère.

## 📋 **Structure JSON Requise**

### **Format Principal**
```json
{
  "sections": [
    {
      "n": 1,                    // Numéro de section
      "t": "Definitions",        // Titre compact (2-3 mots max)
      "ss": [                    // Tableau des sous-sections
        {
          "n": "1.1",            // Numéro de sous-section
          "t": "Scope",          // Titre de sous-section
          "c": "Legal content...", // Contenu légal (détaillé)
          "l": ["(i) item", "(ii) item"] // Éléments de liste numérotés ou null
        }
      ]
    }
  ]
}
```

### **Exemple Complet**
```json
{
  "sections": [
    {
      "n": 1,
      "t": "Definitions and Scope",
      "ss": [
        {
          "n": "1.1",
          "t": "Services",
          "c": "These Terms of Service govern your use of our cloud cybersecurity SaaS platform. The Services include access to our software, applications, and related support services.\n\nBy using our Services, you agree to be bound by these Terms and all applicable laws and regulations.",
          "l": null
        },
        {
          "n": "1.2",
          "t": "Definitions",
          "c": "For purposes of these Terms:\n\n'Company', 'we', 'us', and 'our' refer to [Company Name], a New York-based corporation.\n\n'Customer', 'you', and 'your' refer to the individual or entity using our Services.",
          "l": [
            "(i) 'Company', 'we', 'us', and 'our' refer to [Company Name], a New York-based corporation",
            "(ii) 'Customer', 'you', and 'your' refer to the individual or entity using our Services"
          ]
        }
      ]
    }
  ]
}
```

## 🔧 **Prompt d'IA Modifié**

### **Instructions pour OpenAI**
```
Generate complete Terms of Service for: [USER_PROMPT]

INSTRUCTIONS:
- Generate a complete Terms of Service document with 10 sections
- Output in STRICT JSON format as specified below
- Each section must follow the exact structure
- Use clear, professional legal language
- Include practical examples and legal protections
- Make it comprehensive and legally sound

REQUIRED JSON STRUCTURE:
{
  "sections": [
    {
      "n": 1,                    // Section number
      "t": "Definitions",        // Compact title (2-3 words max)
      "ss": [                    // Subsections array
        {
          "n": "1.1",            // Subsection number
          "t": "Scope",          // Subsection title
          "c": "Legal content...", // Legal content (detailed)
          "l": ["(i) item", "(ii) item"] // Numbered list items or null
        }
      ]
    }
  ]
}

SECTIONS TO GENERATE:
1. Definitions and Scope
2. Services and Usage
3. User Obligations and Account Information
4. Intellectual Property Rights
5. Privacy and Data Protection
6. Limitation of Liability
7. Indemnification
8. Termination and Suspension
9. Governing Law and Disputes
10. Miscellaneous Provisions

IMPORTANT: 
- Output ONLY valid JSON
- No markdown, no explanations
- Follow the exact structure above
- Use proper legal terminology
- Include numbered lists where appropriate
```

## 📱 **Interface Frontend Mise à Jour**

### **Affichage Structuré**
- **Sections** : Affichées avec numéro et titre
- **Sous-sections** : Organisées hiérarchiquement
- **Contenu** : Formaté en paragraphes
- **Listes** : Numérotées automatiquement

### **Boutons de Téléchargement**
- **📥 Download JSON** : Fichier JSON brut
- **📥 Download HTML** : Document HTML professionnel

### **Parsing en Temps Réel**
```typescript
// Try to parse JSON as it streams in
try {
  if (newContent.trim().startsWith('{') && newContent.trim().endsWith('}')) {
    const parsed = JSON.parse(newContent);
    if (parsed.sections && Array.isArray(parsed.sections)) {
      setParsedData(parsed);
      setSections(parsed.sections);
    }
  }
} catch {
  // JSON not complete yet, continue streaming
}
```

## 🎨 **Formatage HTML Professionnel**

### **Styles CSS Inclus**
- **Design moderne** : Interface professionnelle
- **Navigation** : Table des matières avec liens
- **Responsive** : Adapté mobile et desktop
- **Couleurs** : Palette professionnelle

### **Structure HTML**
```html
<div class="tos-container">
  <div class="tos-header">
    <h1>Terms of Service</h1>
    <p>Generated Terms of Service Agreement</p>
  </div>
  
  <div class="generation-info">
    <!-- Informations de génération -->
  </div>
  
  <div class="table-of-contents">
    <!-- Table des matières -->
  </div>
  
  <div class="tos-section" id="section-1">
    <h3 class="section-title">1. Definitions and Scope</h3>
    <div class="subsection">
      <h4 class="subsection-title">1.1 Services</h4>
      <div class="subsection-content">
        <p>Legal content...</p>
      </div>
    </div>
  </div>
</div>
```

## 🔄 **Gestion des Timeouts avec JSON**

### **Reprise Intelligente**
- **Contexte préservé** : JSON partiel sauvegardé
- **Continuation exacte** : Reprend exactement où ça s'est arrêté
- **Structure maintenue** : Format JSON préservé

### **Exemple de Reprise**
```javascript
// Si reprise depuis un timeout, ajouter le contexte
if (resumeFrom) {
  fullPrompt += `\n\nIMPORTANT: Continue exactly from where you left off. Here's what was already generated:\n\n${resumeFrom}\n\nContinue generating from this point, maintaining the same JSON structure and format.`;
}
```

## 📊 **Avantages du Format Structuré**

### **1. Standardisation**
- **Format cohérent** : Structure identique pour tous les documents
- **Validation facile** : JSON valide garanti
- **Parsing automatique** : Traitement programmatique possible

### **2. Flexibilité**
- **Sections multiples** : Organisation hiérarchique
- **Sous-sections** : Détail granulaire
- **Listes numérotées** : Éléments structurés

### **3. Export Multiple**
- **JSON brut** : Pour intégration API
- **HTML professionnel** : Pour présentation
- **PDF possible** : Conversion facile

## 🚀 **Comparaison avec les Exemples**

### **Perplexity.ai**
- **Structure similaire** : Sections et sous-sections
- **Format professionnel** : Langage légal clair
- **Navigation** : Table des matières

### **Zoom.com**
- **Organisation** : Hiérarchie claire
- **Contenu détaillé** : Explications complètes
- **Accessibilité** : Langage compréhensible

## 🔧 **Implémentation Technique**

### **Backend - OpenAI Service**
```javascript
// Prompt modifié pour JSON structuré
const fullPrompt = `Generate complete Terms of Service for: ${userPrompt}

INSTRUCTIONS:
- Output in STRICT JSON format as specified below
- Each section must follow the exact structure
- Use clear, professional legal language`;

// Parsing en temps réel
try {
  if (fullContent.trim().startsWith('{') && fullContent.trim().endsWith('}')) {
    const parsed = JSON.parse(fullContent);
    if (parsed.sections && Array.isArray(parsed.sections)) {
      sectionCount = parsed.sections.length;
    }
  }
} catch (parseError) {
  // JSON not complete yet, continue streaming
}
```

### **Frontend - Parsing et Affichage**
```typescript
// Types TypeScript
interface Subsection {
  n: string;
  t: string;
  c: string;
  l: string[] | null;
}

interface Section {
  n: number;
  t: string;
  ss: Subsection[];
}

interface ParsedData {
  sections: Section[];
}

// Affichage structuré
{sections.map((section, index) => (
  <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
    <h3 className="font-medium text-gray-700 mb-3 text-lg">
      Section {section.n}: {section.t}
    </h3>
    
    {section.ss && Array.isArray(section.ss) && section.ss.map((subsection, subIndex) => (
      <div key={subIndex} className="ml-4 mb-3 p-3 bg-white rounded border">
        <h4 className="font-medium text-gray-600 mb-2">
          {subsection.n} {subsection.t}
        </h4>
        
        {subsection.c && (
          <div className="text-sm text-gray-700 mb-2">
            {subsection.c.split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => (
              <p key={pIndex} className="mb-2">{paragraph.trim()}</p>
            ))}
          </div>
        )}
        
        {subsection.l && Array.isArray(subsection.l) && subsection.l.length > 0 && (
          <ol className="ml-4 text-sm text-gray-700">
            {subsection.l.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">{item.trim()}</li>
            ))}
          </ol>
        )}
      </div>
    ))}
  </div>
))}
```

## ✅ **Validation et Tests**

### **Validation JSON**
- **Structure** : Vérification des propriétés requises
- **Types** : Validation des types de données
- **Complétude** : Vérification des sections manquantes

### **Tests de Génération**
1. **Prompt simple** : Test avec description basique
2. **Prompt complexe** : Test avec exigences détaillées
3. **Reprise timeout** : Test de continuité JSON
4. **Export formats** : Test des téléchargements

## 🎉 **Résultat Final**

Le nouveau système de **format JSON structuré** offre :

- **🎯 Structure professionnelle** : Comme Perplexity et Zoom
- **⚡ Streaming en temps réel** : Génération caractère par caractère
- **🔄 Gestion des timeouts** : Reprise automatique et intelligente
- **📱 Interface moderne** : Affichage structuré et navigation
- **📥 Export multiple** : JSON et HTML professionnel
- **🔧 Architecture robuste** : Parsing en temps réel et validation

**Votre application génère maintenant des Terms of Service de niveau professionnel avec une structure parfaite ! 🚀✨** 