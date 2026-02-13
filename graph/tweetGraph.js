/**
 * Tweet generation LangGraph: Generator agent → Critique agent → (approve or revise).
 * Uses @langchain/langgraph StateGraph with two nodes and conditional edge.
 */

const { Annotation, StateGraph, END, START } = require('@langchain/langgraph');
const { loadKnowledgeBase, getRandomItem } = require('../services/knowledgeBaseLoader');
const { generateTweetContent } = require('../services/ollama.service');
const { critiqueTweet } = require('../services/critique.service');

const MAX_ITERATIONS = 3;

// State: tweet, metadata, critiqueResult, iteration, approved
const TweetState = Annotation.Root({
  tweet: Annotation({
    reducer: (_, right) => right,
    default: () => null
  }),
  metadata: Annotation({
    reducer: (_, right) => right,
    default: () => null
  }),
  critiqueResult: Annotation({
    reducer: (_, right) => right,
    default: () => null
  }),
  iteration: Annotation({
    reducer: (_, right) => right ?? 0,
    default: () => 0
  }),
  approved: Annotation({
    reducer: (_, right) => right,
    default: () => false
  }),
  error: Annotation({
    reducer: (_, right) => right,
    default: () => null
  })
});

/**
 * Generator node: pick random knowledge + post type, generate tweet (with optional feedback).
 */
async function generatorNode(state) {
  const iteration = state.iteration ?? 0;
  const rewriteDirection = state.critiqueResult?.rewrite_direction ?? null;

  const data = loadKnowledgeBase();
  const knowledgeBase = getRandomItem(data.knowledge_base);
  const postType = getRandomItem(data.twitter_post_types);

  const tweet = await generateTweetContent(knowledgeBase, postType, rewriteDirection);

  const metadata = {
    knowledge_id: knowledgeBase.id,
    knowledge_topic: knowledgeBase.topic,
    post_type_id: postType.type_id,
    post_type_name: postType.name,
    generated_at: new Date().toISOString(),
    character_count: tweet.length,
    iteration: iteration + 1
  };

  return {
    tweet,
    metadata,
    iteration: iteration + 1
  };
}

/**
 * Critique node: score tweet and set approved / critiqueResult.
 */
async function critiqueNode(state) {
  const tweet = state.tweet;
  const previousFeedback = state.critiqueResult?.rewrite_direction ?? null;

  const critiqueResult = await critiqueTweet(tweet, previousFeedback);

  return {
    critiqueResult,
    approved: critiqueResult.approved
  };
}

/**
 * Route: if approved or max iterations → END, else → generator (revise).
 */
function routeAfterCritique(state) {
  if (state.approved) return END;
  if ((state.iteration ?? 0) >= MAX_ITERATIONS) return END;
  return 'generator';
}


function createTweetGraph() {
  const graph = new StateGraph(TweetState)
    .addNode('generator', generatorNode)
    .addNode('critique', critiqueNode)
    .addEdge(START, 'generator')
    .addEdge('generator', 'critique')
    .addConditionalEdges('critique', routeAfterCritique, ['generator', END]);

  return graph.compile();
}

/**
 * Run the graph: invoke with initial state, return final state.
 */
async function runTweetGraph() {
  const graph = createTweetGraph();
  const initialState = { iteration: 0 };
  const finalState = await graph.invoke(initialState);

  if (finalState.error) throw new Error(finalState.error);

  return {
    tweet: finalState.tweet,
    metadata: finalState.metadata,
    critiqueResult: finalState.critiqueResult,
    approved: finalState.approved,
    iterations: finalState.iteration
  };
}

module.exports = {
  createTweetGraph,
  runTweetGraph,
  TweetState,
  generatorNode,
  critiqueNode,
  MAX_ITERATIONS
};
