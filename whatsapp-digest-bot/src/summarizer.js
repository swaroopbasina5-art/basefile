const MAX_CHARS_PER_GROUP = 12000;

function buildPrompt(groupTranscripts) {
  const sections = groupTranscripts
    .map(({ groupName, lines }) => {
      const text = lines.join('\n').slice(-MAX_CHARS_PER_GROUP);
      return `### Group: ${groupName}\n${text}`;
    })
    .join('\n\n');

  return `Here are raw WhatsApp group chat transcripts since the last digest. Messages may be in English, Hindi, or Hinglish (Romanized Hindi mixed with English).

${sections}

For EACH group above, write a short digest section. Use this exact format:

*<Group Name>*
- 2-6 crisp bullet points covering the key discussion, decisions, and any questions or tasks aimed at "me" (the person reading this digest)
- Skip greetings, stickers, forwards, and small talk unless they're the only content
- If a group had no meaningful messages, write one line: "No notable activity."

Rules:
- Write each group's summary in whichever of English or Hinglish matches how that group actually chats (mirror their style, don't force pure English).
- Use WhatsApp text formatting only: *bold* for the group name headers, plain bullet points with "-". Do NOT use markdown headers (#), double asterisks, or tables.
- Keep the whole thing scannable on a phone screen. No preamble, no closing remarks — just the group sections back to back.`;
}

async function summarizeWithOllama(prompt, { baseUrl, model }) {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Ollama request failed (${res.status}). Is "ollama serve" running and have you run "ollama pull ${model}"? ${detail}`
    );
  }

  const data = await res.json();
  return data.response;
}

async function summarizeWithAnthropic(prompt, { apiKey, model }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

async function summarizeGroups(groupTranscripts, options) {
  const nonEmpty = groupTranscripts.filter((g) => g.lines.length > 0);
  if (nonEmpty.length === 0) return null;

  const prompt = buildPrompt(nonEmpty);

  if (options.provider === 'anthropic') {
    return summarizeWithAnthropic(prompt, options);
  }
  return summarizeWithOllama(prompt, options);
}

module.exports = { summarizeGroups };
