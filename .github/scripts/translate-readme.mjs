// Localizes the AI-generated sections (AI-DIGEST and AI-TIP) from the English
// README into the Spanish and Portuguese READMEs, by calling the GitHub Models
// REST API directly. Requires a GITHUB_TOKEN with `models: read` permission.
import { extractBetweenMarkers, replaceBetweenMarkers } from './lib/markers.mjs';

const ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const TOKEN = process.env.GITHUB_TOKEN;

const TARGETS = [
  { file: 'README.es.md', language: 'Spanish' },
  { file: 'README.pt.md', language: 'Portuguese' },
];
const TAGS = ['AI-DIGEST', 'AI-TIP'];

async function translate(text, language) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            `Translate the user's Markdown into ${language}. Preserve all Markdown ` +
            `formatting, links, emoji and blockquote markers exactly. Output only the ` +
            `translated Markdown with no preamble.`,
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Models API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function main() {
  if (!TOKEN) {
    console.error('GITHUB_TOKEN is required.');
    process.exit(1);
  }

  for (const tag of TAGS) {
    const source = await extractBetweenMarkers('README.md', tag);
    if (!source) {
      console.log(`No ${tag} content in README.md; skipping.`);
      continue;
    }
    for (const { file, language } of TARGETS) {
      try {
        const translated = await translate(source, language);
        if (translated && (await replaceBetweenMarkers(file, tag, translated))) {
          console.log(`Localized ${tag} -> ${file} (${language})`);
        }
      } catch (err) {
        console.warn(`Could not localize ${tag} for ${file}:`, err.message);
      }
    }
  }
}

main().catch((err) => {
  console.error('Translation failed:', err);
  process.exitCode = 1;
});
