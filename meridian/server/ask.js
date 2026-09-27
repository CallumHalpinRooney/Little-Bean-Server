// "Ask about your data": answers questions about the user's own metrics with Claude.
// The browser sends a compact 30-day summary produced by the analysis engine, and the answer
// streams back as plain text. Only enabled when ANTHROPIC_API_KEY (or another Anthropic
// credential) is available.

const SYSTEM = `You are Meridian, a sharp, honest performance and recovery coach built into a health app for a Huawei Watch GT 6 Pro.
You are given the user's own data as JSON: 30 days of daily metrics, recent workouts, computed readiness drivers, peer percentiles for their age and sex, statistically tested personal patterns, and the app's weekly review.

How to answer:
- Answer the question directly in the first sentence, then give the evidence from their data with specific dates and numbers.
- Be critical when the data supports it. Don't flatter, and say plainly when something is holding them back.
- End with one concrete, doable action when relevant.
- Keep it under 170 words. Plain text only: no markdown headings, no tables, and at most 3 short bullet lines.
- If the data can't answer the question, say what is missing instead of guessing.
- You are not a doctor. For symptoms, abnormal heart findings, or blood oxygen consistently under 90%, recommend seeing a clinician.`;

let clientPromise = null;
async function client() {
  if (!clientPromise) {
    clientPromise = import('@anthropic-ai/sdk').then(({ default: Anthropic }) => new Anthropic());
  }
  return clientPromise;
}

export const askEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export async function ask(req, res, body) {
  const { question, context } = body ?? {};
  if (typeof question !== 'string' || !question.trim() || question.length > 500) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('Ask a question of up to 500 characters.');
    return;
  }
  let anthropic;
  try {
    anthropic = await client();
  } catch {
    res.writeHead(503, { 'content-type': 'text/plain' }).end('Run `npm install` in meridian/ to enable questions.');
    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
  const stream = anthropic.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `My data:\n${JSON.stringify(context).slice(0, 60_000)}\n\nMy question: ${question.trim()}`,
    }],
  });
  stream.on('text', (t) => res.write(t));
  req.on('close', () => stream.abort());
  try {
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') res.write('\n\nI can’t help with that one. Try asking about your sleep, training or recovery.');
    if (final.stop_reason === 'max_tokens') res.write('…');
  } catch (err) {
    if (!res.writableEnded) res.write(`\n\n(Something went wrong: ${err.status ?? ''} ${err.message})`);
  }
  res.end();
}
