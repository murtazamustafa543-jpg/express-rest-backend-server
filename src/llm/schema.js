const { z } = require('zod');

const EnrichInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  price_gbp: z.number(),
  rating_text: z.string()
});

const EnrichOutputSchema = z.object({
  category: z.enum(['fiction', 'non-fiction', 'children', 'poetry', 'mystery', 'science', 'history', 'other']),
  summary: z.string().min(1),
  quality_flags: z.array(z.enum(['no_description', 'low_rating', 'high_price', 'none'])),
  confidence: z.number().min(0).max(1)
});

module.exports = { EnrichInputSchema, EnrichOutputSchema };