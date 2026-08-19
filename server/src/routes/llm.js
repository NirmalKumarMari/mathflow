import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// Mirrors base44's integrations.Core.InvokeLLM({ prompt, response_json_schema }):
// plain text back when no schema is given, a JSON object matching the schema
// when one is. Keeping this server-side is also what keeps the Anthropic API
// key out of the browser.
router.post('/invoke-llm', requireAuth, async (req, res) => {
  const { prompt, response_json_schema: schema } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    if (schema) {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ name: 'respond', description: 'Return the structured response.', input_schema: schema }],
        tool_choice: { type: 'tool', name: 'respond' },
      });
      const toolUse = message.content.find((block) => block.type === 'tool_use');
      if (!toolUse) return res.status(502).json({ error: 'Model did not return a structured response' });
      return res.json(toolUse.input);
    }

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    res.json(text);
  } catch (err) {
    console.error('InvokeLLM failed:', err);
    res.status(502).json({ error: 'The AI tutor is temporarily unavailable. Please try again.' });
  }
});

export default router;
