const express = require('express');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');

const router = express.Router();

const systemPrompt = fs.readFileSync(
  path.join(__dirname, '../../prompts/enrich-v1.md'),
  'utf8'
);

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

// Helper: try to extract JSON from model text
function extractJson(text) {
  // Remove markdown code fences if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find the first { ... }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Helper: write failed answers to quarantine log
function quarantine(input, raw, error, promptVersion = 'enrich-v1') {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    promptVersion,
    input,
    raw,
    error: error.message || String(error)
  }) + '\n';

  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(path.join(logDir, 'quarantine.jsonl'), line);
}

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

  // 4. Call the model
  async function callModel(extraMessage = null) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(input) }
    ];
    if (extraMessage) {
      messages.push({ role: 'user', content: extraMessage });
    }

    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL,
      temperature: 0.2,
      messages
    });
    return response.choices[0].message.content;
  }

  try {
    // First attempt
    let raw = await callModel();
    let parsed;

    try {
      parsed = extractJson(raw);
      const validated = EnrichOutputSchema.safeParse(parsed);
      if (validated.success) {
        return res.json(validated.data); // happy path
      }
      // validation failed → repair
      const errorMsg = validated.error.issues.map(i => i.message).join('; ');
      raw = await callModel(
        `Your previous answer was rejected for this reason: ${errorMsg}. Return ONLY corrected JSON matching the schema.`
      );
      parsed = extractJson(raw);
      const repaired = EnrichOutputSchema.safeParse(parsed);
      if (repaired.success) {
        return res.json(repaired.data);
      }
      // still bad → quarantine
      quarantine(input, raw, repaired.error);
      return res.status(422).json({ error: 'Model output could not be validated after repair' });
    } catch (parseErr) {
      // first parse failed → try one repair
      raw = await callModel(
        `Your previous answer was not valid JSON. Return ONLY a correct JSON object matching the schema.`
      );
      try {
        parsed = extractJson(raw);
        const repaired = EnrichOutputSchema.safeParse(parsed);
        if (repaired.success) {
          return res.json(repaired.data);
        }
        quarantine(input, raw, repaired.error);
        return res.status(422).json({ error: 'Model output could not be validated after repair' });
      } catch (finalErr) {
        quarantine(input, raw, finalErr);
        return res.status(422).json({ error: 'Model output could not be parsed after repair' });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Model call failed', details: err.message });
  }
});

module.exports = router;