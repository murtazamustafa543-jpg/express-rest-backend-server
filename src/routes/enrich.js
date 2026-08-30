const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');

const PROMPT_VERSION = 'enrich-v1';
const LOGS_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Load prompt file
const systemPrompt = fs.readFileSync(
  path.join(__dirname, '../../prompts/enrich-v1.md'),
  'utf-8'
);

// Create OpenAI client with timeout
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  timeout: 30000,  // 30 seconds — not the default 10 minutes
  maxRetries: 0    // we handle retries ourselves
});

// Cost logger
function logCall({ input_tokens, output_tokens, duration_ms, repair, error, prompt_version }) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    prompt_version,
    model: process.env.LLM_MODEL,
    input_tokens,
    output_tokens,
    duration_ms,
    repair,
    error: error || null
  });
  fs.appendFileSync(path.join(LOGS_DIR, 'cost.jsonl'), line + '\n');
}

// Quarantine logger
function logQuarantine({ input, raw_output, error, prompt_version }) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    prompt_version,
    input,
    raw_output,
    error
  });
  fs.appendFileSync(path.join(LOGS_DIR, 'quarantine.jsonl'), line + '\n');
}

// Call model with retry logic
async function callModel(messages, attempt = 1) {
  const start = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL,
      messages,
      temperature: 0.1
    });

    return {
      content: response.choices[0].message.content,
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      duration_ms: Date.now() - start
    };
  } catch (err) {
    const status = err.status;

    // Never retry these
    if (status === 400 || status === 401 || status === 403) {
      throw err;
    }

    // Retry on timeout, 429, 5xx — max 3 attempts
    if (attempt < 3 && (err.code === 'ETIMEDOUT' || status === 429 || (status >= 500 && status < 600))) {
      const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500; // exponential backoff with jitter
      console.log(`Retry attempt ${attempt + 1} after ${wait}ms`);
      await new Promise(resolve => setTimeout(resolve, wait));
      return callModel(messages, attempt + 1);
    }

    throw err;
  }
}

// Parse and validate model output
function parseAndValidate(text) {
  // Strip code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { success: false, error: 'Invalid JSON: ' + e.message };
  }

  const result = EnrichOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.data };
}

router.post('/enrich', async (req, res) => {
  // Validate input
  const inputResult = EnrichInputSchema.safeParse(req.body);
  if (!inputResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: inputResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const input = inputResult.data;

  // Stub mode
  if (process.env.LLM_STUB === '1') {
    return res.json({
      category: 'fiction',
      summary: 'A stub response for testing purposes.',
      quality_flags: [],
      confidence: 0.95
    });
  }

  // Kill switch
  if (process.env.LLM_ENABLED === 'false') {
    return res.status(503).json({
      error: "LLM service is currently disabled",
      fallback: {
        category: 'other',
        summary: 'Service temporarily unavailable.',
        quality_flags: [],
        confidence: 0
      }
    });
  }

  const userMessage = JSON.stringify(input);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  let callResult;
  let repair = false;

  try {
    // First attempt
    callResult = await callModel(messages);
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: "Model call timed out" });
    }
    return res.status(502).json({ error: "Model call failed: " + err.message });
  }

  let validation = parseAndValidate(callResult.content);

  // Repair once if failed
  if (!validation.success) {
    repair = true;
    const repairMessages = [
      ...messages,
      { role: 'assistant', content: callResult.content },
      {
        role: 'user',
        content: `Your previous answer was rejected for this reason: ${validation.error}. Return only corrected JSON matching the schema exactly.`
      }
    ];

    try {
      callResult = await callModel(repairMessages);
      validation = parseAndValidate(callResult.content);
    } catch (err) {
      logCall({
        input_tokens: 0,
        output_tokens: 0,
        duration_ms: 0,
        repair,
        error: err.message,
        prompt_version: PROMPT_VERSION
      });
      return res.status(502).json({ error: "Repair call failed" });
    }
  }

  // Log the call
  logCall({
    input_tokens: callResult.input_tokens,
    output_tokens: callResult.output_tokens,
    duration_ms: callResult.duration_ms,
    repair,
    prompt_version: PROMPT_VERSION
  });

  // If still failing after repair — quarantine and return 422
  if (!validation.success) {
    logQuarantine({
      input,
      raw_output: callResult.content,
      error: validation.error,
      prompt_version: PROMPT_VERSION
    });
    return res.status(422).json({
      error: "Model output could not be validated after repair",
      reason: validation.error
    });
  }

  res.json(validation.data);
});

module.exports = router;