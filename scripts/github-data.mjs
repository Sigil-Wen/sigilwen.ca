const username = "Sigil-Wen";
const dayMilliseconds = 86_400_000;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
}

function nonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${label}`);
  return value;
}

// Extract only public dates and numbers; never serve fetched GitHub HTML.
export function parseContributions(html) {
  const heading = html.match(/<h2\b[^>]*id=["']js-contribution-activity-description["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  const totalText = heading?.replace(/<[^>]*>/g, " ").match(/([\d,]+)\s+contributions?\b/i)?.[1];
  if (!totalText) throw new Error("GitHub contribution total is missing");
  const totalContributions = nonnegativeInteger(Number(totalText.replaceAll(",", "")), "contribution total");
  const counts = new Map();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    const id = attribute(match[1], "for");
    const count = match[2].replace(/<[^>]*>/g, " ").trim().match(/^(No|[\d,]+) contributions?\b/i)?.[1];
    if (id && count) counts.set(id, count.toLowerCase() === "no" ? 0 : Number(count.replaceAll(",", "")));
  }
  const days = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*>/gi)) {
    const date = attribute(tag, "data-date");
    if (!date) continue;
    const level = attribute(tag, "data-level");
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== date || !/^[0-4]$/.test(level || "")) {
      throw new Error("Invalid GitHub contribution day");
    }
    days.push({ date, count: nonnegativeInteger(counts.get(attribute(tag, "id")), "daily contributions"), level: Number(level) });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  // Include GitHub's initial Sunday padding and the current partial week.
  if (days.length < 365 || days.length > 373 || new Date(`${days[0].date}T00:00:00Z`).getUTCDay() !== 0) {
    throw new Error("GitHub did not return a full contribution calendar");
  }
  for (let index = 1; index < days.length; index++) {
    if (Date.parse(days[index].date) - Date.parse(days[index - 1].date) !== dayMilliseconds) {
      throw new Error("GitHub contribution dates are missing or duplicated");
    }
  }
  return { totalContributions, days };
}

export function makeSnapshot(profile, html, now = new Date()) {
  if (profile.login?.toLowerCase() !== username.toLowerCase()) throw new Error("Unexpected GitHub profile");
  const calendar = parseContributions(html);
  const age = now.getTime() - Date.parse(`${calendar.days.at(-1).date}T00:00:00Z`);
  if (age < -dayMilliseconds || age > 3 * dayMilliseconds) throw new Error("GitHub calendar is out of date");
  return {
    username, updatedAt: now.toISOString(),
    followers: nonnegativeInteger(profile.followers, "followers"),
    following: nonnegativeInteger(profile.following, "following"),
    publicRepos: nonnegativeInteger(profile.public_repos, "public repos"),
    ...calendar,
  };
}

async function getText(url, fetcher) {
  const response = await fetcher(url, {
    headers: { "User-Agent": "sigilwen.ca-github-activity", Accept: url.includes("api.github.com") ? "application/vnd.github+json" : "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new Error("GitHub response is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function fetchSnapshot(fetcher = fetch) {
  const [profile, calendar] = await Promise.all([
    getText(`https://api.github.com/users/${username}`, fetcher),
    getText(`https://github.com/users/${username}/contributions`, fetcher),
  ]);
  return makeSnapshot(JSON.parse(profile), calendar);
}
