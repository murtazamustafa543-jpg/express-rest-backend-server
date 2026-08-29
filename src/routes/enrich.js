const express = require('express');
const router = express.Router();
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');

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
    return res.status(503).json({ error: "LLM service is currently disabled" });
  }

  // Real model call comes in Stage 2
  res.json({ message: "Model call coming in Stage 2" });
});

module.exports = router;