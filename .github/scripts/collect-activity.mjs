// Collects David's recent public GitHub activity and writes a compact prompt
// file that the AI digest workflow feeds to GitHub Models.
import { writeFile, mkdir } from 'node:fs/promises';

const USER = 'dsanchezcr';
const DAYS = 14;
const OUT = '.github/tmp/digest-prompt.txt';

const token = process.env.GH_TOKEN;
const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;

async function getEvents() {
  const events = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(
      `https://api.github.com/users/${USER}/events/public?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    events.push(...batch);
    if (batch.length < 100) break;
  }
  return events.filter((e) => new Date(e.created_at).getTime() >= since);
}

function summarize(events) {
  const byRepo = new Map();
  const tally = { commits: 0, prs: 0, issues: 0, releases: 0, reviews: 0, created: 0 };

  for (const e of events) {
    const repo = e.repo?.name ?? 'unknown';
    const entry = byRepo.get(repo) ?? { commits: 0, prs: 0, issues: 0, releases: 0, reviews: 0 };
    switch (e.type) {
      case 'PushEvent': {
        const n = e.payload?.commits?.length ?? 0;
        entry.commits += n; tally.commits += n; break;
      }
      case 'PullRequestEvent':
        if (e.payload?.action === 'opened' || e.payload?.action === 'reopened') { entry.prs++; tally.prs++; }
        break;
      case 'IssuesEvent':
        if (e.payload?.action === 'opened') { entry.issues++; tally.issues++; }
        break;
      case 'ReleaseEvent':
        entry.releases++; tally.releases++; break;
      case 'PullRequestReviewEvent':
        entry.reviews++; tally.reviews++; break;
      case 'CreateEvent':
        if (e.payload?.ref_type === 'repository') tally.created++;
        break;
    }
    byRepo.set(repo, entry);
  }

  const repoLines = [...byRepo.entries()]
    .map(([repo, s]) => {
      const parts = [];
      if (s.commits) parts.push(`${s.commits} commits`);
      if (s.prs) parts.push(`${s.prs} PRs`);
      if (s.reviews) parts.push(`${s.reviews} reviews`);
      if (s.issues) parts.push(`${s.issues} issues`);
      if (s.releases) parts.push(`${s.releases} releases`);
      return parts.length ? `- ${repo}: ${parts.join(', ')}` : null;
    })
    .filter(Boolean);

  return { repoLines, tally };
}

async function main() {
  let events = [];
  try {
    events = await getEvents();
  } catch (err) {
    console.warn('Could not fetch activity:', err.message);
  }

  const { repoLines, tally } = summarize(events);

  if (repoLines.length === 0) {
    console.log('No recent activity found; writing a neutral prompt.');
  }

  const prompt = [
    `Write a short, first-person "What I've been building lately" update for my GitHub profile,`,
    `based on my real GitHub activity from the last ${DAYS} days summarized below.`,
    ``,
    `Requirements:`,
    `- 2 to 4 short Markdown bullet points, friendly and professional.`,
    `- Focus on themes and projects, not raw numbers; mention at most one or two repos by short name.`,
    `- No preamble, no heading, no closing remarks — just the bullets.`,
    `- If activity is sparse, write a brief, upbeat note about staying focused on Azure, GitHub and AI.`,
    ``,
    `Totals: ${tally.commits} commits, ${tally.prs} PRs opened, ${tally.reviews} reviews, ${tally.issues} issues, ${tally.releases} releases, ${tally.created} new repos.`,
    ``,
    `Per-repository activity:`,
    ...(repoLines.length ? repoLines : ['- (no notable public activity this period)']),
  ].join('\n');

  await mkdir('.github/tmp', { recursive: true });
  await writeFile(OUT, prompt, 'utf8');
  console.log(`Wrote prompt to ${OUT}`);
}

main().catch((err) => {
  console.error('Failed to collect activity:', err);
  process.exitCode = 1;
});
