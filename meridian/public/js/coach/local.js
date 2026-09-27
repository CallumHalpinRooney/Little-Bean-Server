// The coach running inside a claude.ai Artifact: Claude is reached through the viewer's own
// Claude account (the `sample` capability), so there is no server and no API key. The
// coach's tools run right here in the page, on the data the page already holds.

import { createToolbox, TOOL_STATUS } from './tools.js';
import { SYSTEM, PROMPTS, athleteBlock, FOLLOW } from './prompt.js';

// Resolves the sample function when this page runs as an Artifact that can use tools,
// otherwise null (a normal browser tab, or a view without tool support).
export async function getSampler() {
  if (!window.claude?.use) return null;
  try {
    const sample = await window.claude.use('sample');
    if (!sample) return null;
    const limits = await sample.limits().catch(() => null);
    return limits?.tools ? sample : null;
  } catch {
    return null;
  }
}

const MESSAGES = {
  not_granted: 'Claude access was declined for this page. Reload the page to be asked again.',
  rate_limited: 'You’ve reached your Claude usage limit, or asked too quickly. Try again a bit later.',
  session_expired: 'Your Claude session expired. Sign in again, then retry.',
  prompt_too_large: 'The conversation has got too long. Clear it under You and ask again.',
  refused: 'Claude couldn’t answer that one. Try asking it differently.',
  empty_completion: 'No answer came back. Try asking more simply.',
  sampling_disabled: 'Claude isn’t available for this account.',
  tools_unavailable: 'This view can’t run the coach’s tools. Open the page in claude.ai.',
};
export const errorMessage = (e) => MESSAGES[e?.code] ?? 'Connection problem. Try again in a moment.';

// Everything before the FOLLOWUPS marker is the answer. A marker still being written at the
// end is trimmed so it never flashes on screen.
export function splitFollowups(text) {
  const i = text.indexOf(FOLLOW);
  if (i < 0) {
    for (let k = FOLLOW.length - 1; k > 0; k--) if (text.endsWith(FOLLOW.slice(0, k))) return { shown: text.slice(0, -k), followups: [] };
    return { shown: text, followups: [] };
  }
  const followups = text.slice(i + FOLLOW.length).split('\n')[0].split('|')
    .map((q) => q.trim().replace(/^["“']+|["”']+$/g, '')).filter(Boolean).slice(0, 3);
  return { shown: text.slice(0, i).trimEnd(), followups };
}

export async function askLocal(sample, req, { onStatus, onText, signal }) {
  const { kind = 'chat', message = '', runId, history = [], athlete, goal, symptoms, runNotes, data } = req;
  const toolbox = createToolbox(data, { goal, symptoms, runNotes });
  const runRef = typeof runId === 'string' && /^[\w-]{1,64}$/.test(runId) ? `\n\n(Run id: ${runId})` : '';
  const prompt = PROMPTS[kind] ?? `${String(message).trim()}${runRef}`;

  // There's no system prompt here: standing instructions travel as a leading user turn.
  // History is trimmed to stay well inside the 64 KiB input limit.
  const turns = [
    { role: 'user', content: `${SYSTEM}\n\n${athleteBlock(athlete, data.today)}` },
    ...history.slice(-10).map((m) => ({ role: m.role, content: String(m.content).slice(0, 2500) })),
    { role: 'user', content: prompt },
  ];

  const tools = toolbox.definitions.map((d) => ({
    name: d.name,
    description: d.description.slice(0, 1000),
    inputSchema: d.input_schema,
    execute(input) {
      onStatus?.(TOOL_STATUS[d.name] ?? 'Working it out');
      const r = toolbox.run(d.name, input); // validates the input before running
      if (r.isError) throw new Error(JSON.parse(r.content).error);
      return r.content;
    },
  }));

  const { text, truncated } = await sample(turns, {
    tools,
    signal,
    onText: ({ text: t }) => onText?.(splitFollowups(t).shown),
  });
  const { shown, followups } = splitFollowups(text);
  return { text: truncated ? `${shown}…` : shown, followups, events: toolbox.events };
}
