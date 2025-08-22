# 🔄 Simple Backend Flow - Contract Generator

## 📥 **INPUT** → 📤 **OUTPUT**

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Prompt: "Draft terms for SaaS company"                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Prompt validation                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. Prompt enhancement                                  │   │
│  │    + Detailed legal instructions                       │   │
│  │    + Structured JSON format                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. OpenAI GPT-4o call                                  │   │
│  │    + System prompt: "Senior legal expert"              │   │
│  │    + User prompt: Enhanced                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. JSON chunks reception                               │   │
│  │    { n: 1, t: "Def", ss: [{ n: "1.1", t: "Scope" }] }│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 5. Progressive HTML construction                       │   │
│  │    a) HTML Header + CSS                                │   │
│  │    b) Contract content                                 │   │
│  │    c) HTML Footer                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Complete HTML with integrated CSS                       │   │
│  │ + Immediate display                                     │   │
│  │ + Direct download                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 **Streaming Sequence**

```
1️⃣ HEADER    → HTML Template + CSS
2️⃣ CONTENT   → Contract sections
3️⃣ FOOTER    → Finalization + Scripts
4️⃣ COMPLETE  → Final assembled HTML
```

## 📊 **Data Transformation**

```
Simple prompt → Enhanced prompt → Structured JSON → Formatted HTML
     ↓              ↓              ↓              ↓
"Terms for SaaS" → "Detailed legal instructions" → {n:1, t:"Def"} → <h2>1. Definitions</h2>
```

## 🎯 **Key Points**

- ✅ **Backend** : Handles all HTML formatting
- ✅ **Frontend** : Receives and displays final HTML
- ✅ **Streaming** : Progressive construction (invisible)
- ✅ **Result** : HTML file ready for download 