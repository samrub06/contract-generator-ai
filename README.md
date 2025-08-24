# Contract Generator AI

Website in live : https://contract-generator-ai-1b1a3e40343c.herokuapp.com/

Diagram drawio : https://drive.google.com/file/d/1W9EZSL7H7p-vpynmxwi369ikUYvLK5-8/view?usp=drive_link




## Architecture

![Architecture Diagram](architecture.png)

1. **PROMPT TEXT** (req.body.prompt)
   ↓
2. **TEXT ANALYSIS** (generateLongContract)
   ↓
3. **STRUCTURED JSON** (OpenAI + Zod Schema)
   ↓
4. **HTML CONVERSION** (Frontend)
   ↓
5. **REAL-TIME STREAMING** (SSE with chunks)

## Features

- **Long Contract Generation**: 10+ page contracts with intelligent chunking
- **Real-time Streaming**: Live updates via Server-Sent Events
- **Structured Output**: OpenAI with Zod schema validation
- **Fallback System**: Robust error handling with retry mechanism
- **Partial Download**: Download contracts even if generation is stopped
- **Stop Functionality**: Cancel generation at any time

## Quick Start

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Stack

- **Backend**: Node.js, Express, OpenAI API
- **Frontend**: React, TypeScript, Tailwind CSS
- **Validation**: Zod schemas
- **Streaming**: Server-Sent Events (SSE)
