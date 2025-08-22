# Setup Instructions

## 1. Environment Variables
Create a `.env` file in the backend directory with:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Run the Server
```bash
npm run dev
```

## 4. Test the API
```bash
POST /api/contract/generate
Body: { "userPrompt": "Create a rental contract" }
```

## 5. Expected Output Format
The API will stream JSON responses with:
- `chunk`: Content chunk
- `section`: Current section (welcome, contract, validation, error)
- `progress`: Progress status (started, streaming, done, failed)
- `timestamp`: ISO timestamp
- `data`: Final parsed contract (when complete) 