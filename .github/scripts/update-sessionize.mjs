// Updates the SESSIONIZE marker in the README with David's latest talks.
// Requires a Sessionize API endpoint id, provided via the SESSIONIZE_API_ID
// environment variable (a repository variable). If it is missing or the API
// returns nothing usable, the script exits without changing anything.
import { replaceBetweenMarkers } from './lib/markers.mjs';

const API_ID = process.env.SESSIONIZE_API_ID?.trim();
const MAX = 5;

function flattenSessions(data) {
  // Sessionize "Sessions" view returns groups: [{ groupName, sessions: [...] }]
  // Other views can return a flat array of sessions. Handle both defensively.
  if (!Array.isArray(data)) return [];
  if (data.length && Array.isArray(data[0]?.sessions)) {
    return data.flatMap((g) => g.sessions ?? []);
  }
  return data.filter((s) => s && (s.title || s.name));
}

function whenLabel(s) {
  const raw = s.startsAt || s.startAt || s.date;
  if (!raw) return s.eventName || s.event || '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return s.eventName || '';
  const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return s.eventName ? `${s.eventName} · ${date}` : date;
}

async function main() {
  if (!API_ID) {
    console.log('SESSIONIZE_API_ID not set; skipping (leaving default content).');
    return;
  }

  const url = `https://sessionize.com/api/v2/${encodeURIComponent(API_ID)}/view/Sessions?format=json`;
  let sessions = [];
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    sessions = flattenSessions(await res.json());
  } catch (err) {
    console.warn('Could not fetch Sessionize data; leaving content unchanged.', err.message);
    return;
  }

  if (!sessions.length) {
    console.log('No sessions returned; leaving content unchanged.');
    return;
  }

  // Sort by date descending when available, then take the most recent few.
  sessions.sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0));

  const items = sessions.slice(0, MAX).map((s) => {
    const title = (s.title || s.name || 'Untitled talk').trim();
    const when = whenLabel(s);
    return when ? `- 🎤 **${title}** — ${when}` : `- 🎤 **${title}**`;
  });

  items.push('', '🔗 [See my full speaker profile on Sessionize →](https://sessionize.com/dsanchezcr)');

  const block = items.join('\n');
  if (await replaceBetweenMarkers('README.md', 'SESSIONIZE', block)) {
    console.log(`Updated SESSIONIZE with ${Math.min(sessions.length, MAX)} talk(s).`);
  } else {
    console.log('No marker changes were necessary.');
  }
}

main().catch((err) => {
  console.error('Failed to update Sessionize talks:', err);
  process.exitCode = 1;
});
