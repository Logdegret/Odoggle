import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SCORING_PROMPT = `You are a professional dog show judge scoring dogs in a 1v1 cuteness competition.

Analyze this dog photo and provide scores in the following JSON format ONLY (no other text):
{
  "score": <number 1-10 with one decimal>,
  "breed": "<identified breed or mix>",
  "breakdown": {
    "cuteness": <1-10>,
    "coat": <1-10>,
    "eyes": <1-10>,
    "expression": <1-10>
  },
  "verdict": "<one fun sentence about this dog, max 12 words>"
}

Score honestly. A score of 5.0 is average. Great dogs score 7-9. Only truly exceptional dogs score above 9.
If there is no dog visible, return score 1.0 with breed "no dog detected".`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, roomId } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini 2.0 Flash vision API
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
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const scoring = JSON.parse(jsonMatch[0]);

    // If roomId provided, submit via Postgres function
    if (roomId) {
      const authHeader = req.headers.get('Authorization');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Extract player ID from JWT
      const token = authHeader?.replace('Bearer ', '');
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

    return new Response(
      JSON.stringify(scoring),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('gemini-score error:', err);
    return new Response(
      JSON.stringify({ score: 5.0, breed: 'mystery pup', breakdown: null, verdict: 'A true mystery!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
