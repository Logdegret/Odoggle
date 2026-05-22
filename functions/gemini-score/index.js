import functions from '@google-cloud/functions-framework';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SCORING_PROMPT = `You are a professional dog show judge scoring pets in a 1v1 cuteness competition.

Analyze this pet photo and provide scores in the following JSON format ONLY (no other text):
{
  "score": <number 1-10 with one decimal>,
  "breed": "<identified breed, species, or mix>",
  "breakdown": {
    "cuteness": <1-10>,
    "coat": <1-10>,
    "eyes": <1-10>,
    "expression": <1-10>
  },
  "verdict": "<one fun sentence about this pet, max 12 words>"
}

Score honestly. A score of 5.0 is average. Great pets score 7-9. Only truly exceptional pets score above 9.
If there is no pet visible, return score 1.0 with breed "no pet detected".`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

functions.http('geminiScore', async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.set(CORS_HEADERS).status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.set(CORS_HEADERS).status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { imageBase64, roomId } = req.body;

    if (!imageBase64) {
      res.set(CORS_HEADERS).status(400).json({ error: 'imageBase64 required' });
      return;
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SCORING_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini API error: ${geminiRes.status}`);

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const scoring = JSON.parse(jsonMatch[0]);

    if (roomId) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        await supabase.rpc('submit_score', {
          p_room_id:   roomId,
          p_player_id: user.id,
          p_score:     scoring.score,
          p_pet_type:  scoring.breed,
          p_breakdown: scoring.breakdown,
          p_verdict:   scoring.verdict,
        });
      }
    }

    res.set({ ...CORS_HEADERS, 'Content-Type': 'application/json' }).json(scoring);
  } catch (err) {
    console.error('gemini-score error:', err);
    res.set({ ...CORS_HEADERS, 'Content-Type': 'application/json' }).json({
      score: 5.0, breed: 'mystery pup', breakdown: null, verdict: 'A true mystery!',
    });
  }
});
