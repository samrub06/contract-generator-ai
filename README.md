1. PROMPT TEXT (req.body.prompt)
   ↓
2. ANALYSE DU TEXTE (generateMockContractData)
   ↓
3. STRUCTURE JSON (mockContract)
   ↓
4. CONVERSION HTML (generateMockHTML)
   ↓
5. STREAMING SSE (res.write avec chunks)