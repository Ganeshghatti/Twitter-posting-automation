const { callOllama } = require('./ollama.service');
const { CRITIQUE_SYSTEM_PROMPT, CRITIQUE_FRAMEWORK, getCritiqueUserPrompt } = require('../prompts/critiqueFramework');

const PASS_THRESHOLD = 7;
const MIN_INDIVIDUAL_SCORE = 6;

/**
 * Parse critique JSON from model response (strip markdown/code blocks if present)
 */
function parseCritiqueResponse(raw) {
  const trimmed = raw.trim();
  let jsonStr = trimmed;
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}') + 1;
  if (start === -1 || end <= start) throw new Error('No JSON object in critique response');
  return JSON.parse(jsonStr.slice(start, end));
}

/**
 * Run critique agent on a tweet. Returns scores, approved, verdict, issues, rewrite_direction.
 */
async function critiqueTweet(tweet, previousFeedback = null) {
  const systemPrompt = CRITIQUE_SYSTEM_PROMPT + '\n\n' + CRITIQUE_FRAMEWORK;
  const userPrompt = getCritiqueUserPrompt(tweet, previousFeedback);

  const raw = await callOllama(systemPrompt, userPrompt, { temperature: 0.2 });
  const parsed = parseCritiqueResponse(raw);

  const a = parsed.authenticity_score ?? 5;
  const h = parsed.hook_score ?? 5;
  const f = parsed.formatting_score ?? 5;
  const c = parsed.content_value_score ?? 5;
  const overall = parsed.overall_score ?? (a + h + f + c) / 4;
  const approved = parsed.approved ?? (overall >= PASS_THRESHOLD && Math.min(a, h, f, c) >= MIN_INDIVIDUAL_SCORE);
  const verdict = parsed.verdict ?? (approved ? 'APPROVE' : 'REVISE');

  return {
    authenticity_score: a,
    hook_score: h,
    formatting_score: f,
    content_value_score: c,
    overall_score: overall,
    approved: Boolean(approved),
    verdict: String(verdict),
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    rewrite_direction: String(parsed.rewrite_direction || ''),
    raw: parsed
  };
}

module.exports = {
  critiqueTweet,
  parseCritiqueResponse,
  PASS_THRESHOLD,
  MIN_INDIVIDUAL_SCORE
};
