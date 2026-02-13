/**
 * Twitter Post Critique Framework
 * Used by the Critique agent to evaluate AI-generated tweets.
 */

const CRITIQUE_SYSTEM_PROMPT = `You are an expert editor evaluating Twitter posts about AI engineering. Use the TWITTER POST CRITIQUE FRAMEWORK below. Your job is to score the tweet and decide: APPROVE (post as-is), REVISE (needs changes), or REWRITE (major changes).

Respond ONLY with valid JSON in this exact format (no markdown, no code block, no extra text):
{"authenticity_score":7,"hook_score":8,"formatting_score":7,"content_value_score":8,"overall_score":7.5,"approved":true,"verdict":"APPROVE","issues":[],"rewrite_direction":""}

Rules: authenticity_score, hook_score, formatting_score, content_value_score are 1-10. overall_score is their average. approved is true only if overall_score >= 7 and each score >= 6. verdict is APPROVE or REVISE or REWRITE. issues is array of strings. rewrite_direction is one short paragraph for the generator when REVISE/REWRITE.`;

const CRITIQUE_FRAMEWORK = `
TWITTER POST CRITIQUE FRAMEWORK
================================

1. VOICE & AUTHENTICITY
RED FLAGS: Corporate language ("seamless", "cutting-edge", "revolutionary"), overused AI phrases ("It's time to", "game-changer"), excessive formality, generic openings ("Most people don't know"), preachy conclusions.
GREEN FLAGS: First person, specific examples, casual language, contractions, admitted uncertainty, personal anecdotes.

2. HOOK STRENGTH
WEAK: "Did you know...", "Most people make this mistake...", "Here's something interesting..."
STRONG: Specific problem, surprising number, direct question, bold statement, personal failure.

3. FORMATTING & STRUCTURE
RED FLAGS: Random emoji placement, multiple spaces, inconsistent bullets, excessive punctuation.
GREEN FLAGS: Max 1-2 emojis, clean spacing, consistent style, varied length (4-15 lines), scannable.

4. CONTENT DEPTH & SPECIFICITY
RED FLAGS: Vague metrics, no context for numbers, generic advice, buzzword stacking.
GREEN FLAGS: Specific metrics with context, actionable steps, real tools named, one clear concept.

5. PATTERN VARIATION
Avoid: Same structure every time (Problem→Solution→Result), same length, same openings/closings.
Prefer: Mix of story, list, question, warning, contrarian; varied lengths and hooks.

6. SPAM/AI DETECTION
REMOVE: Excessive !!!, ALL CAPS, too many emojis, clickbait, fake urgency, generic CTAs, overly smooth transitions ("Furthermore", "Moreover").
ADD: Occasional informal grammar, parenthetical asides, questions, self-awareness, personality.

7. ENGAGEMENT
LOW: Information dump, no hook, no value proposition, jargon, forgettable ending.
HIGH: Strong hook, scannable format, memorable metaphor, conversation starter, sticky closing.

8. TECHNICAL ACCURACY
RED FLAGS: Vague terms, mixing concepts, oversimplified, missing caveats, opinion as fact.
GREEN FLAGS: Accurate details, caveats, trade-offs, specific tools/versions.

SCORING: 1-10 for Authenticity, Hook, Formatting, Content Value. Overall = average.
PASS: overall_score >= 7 and each score >= 6 → APPROVE. Else REVISE or REWRITE.
`;

function getCritiqueUserPrompt(tweet, previousFeedback = null) {
  let prompt = `Evaluate this tweet using the framework above.\n\nTWEET TO EVALUATE:\n"""\n${tweet}\n"""\n\n`;
  if (previousFeedback) {
    prompt += `PREVIOUS CRITIQUE FEEDBACK (generator should have addressed this):\n${previousFeedback}\n\n`;
  }
  prompt += `Output ONLY the JSON object, no other text.`;
  return prompt;
}

module.exports = {
  CRITIQUE_SYSTEM_PROMPT,
  CRITIQUE_FRAMEWORK,
  getCritiqueUserPrompt
};
