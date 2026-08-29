const express = require('express');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { EnrichInputSchema } = require('../llm/schema');

const router = express.Router();

// Load the prompt once when the server starts
const systemPrompt = fs.readFileSync(
  path.join(__dirname, '../../prompts/enrich-v1.md'),
  'utf8'
);

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

router.post('/enrich', async (req, res) => {
  // 1. Validate input
  const inputResult = EnrichInputSchema.safeParse(req.body);
  if (!inputResult.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: inputResult.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const input = inputResult.data;

  // 2. Stub mode
  if (process.env.LLM_STUB === '1') {
    return res.json({
      category: 'fiction',
      summary: 'A stub response for testing purposes.',
      quality_flags: [],
      confidence: 0.95
    });
  }

  // 3. Kill switch
  if (process.env.LLM_ENABLED === 'false') {
    return res.status(503).json({ error: 'LLM service is currently disabled' });
  }

  // 4. Real model call
  try {
    const userMessage = JSON.stringify(input);

    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    const raw = response.choices[0].message.content;
    // For Stage 2 we just return whatever the model said
    res.json({ raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Model call failed', details: err.message });
  }
});

module.exports = router;