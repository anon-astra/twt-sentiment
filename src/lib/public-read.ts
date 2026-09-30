const STATUS_HOSTS = new Set([
  "x.com",
  "twitter.com",
  "mobile.twitter.com",
  "mobile.x.com",
  "fxtwitter.com",
  "vxtwitter.com",
]);
const WINDOW_MS = 60_000;
const MAX_READS = 8;
const hits: number[] = [];

export type RawPublicPost = {
  id: string;
  handle: string;
  name: string;
  text: string;
  createdAt: string;
  likes: number;
  reposts: number;
  replies: number;
  url: string;
};

export type PublicRead = { ok: true; post: RawPublicPost } | { ok: false; reason: string };

export type CountRead =
  | { ok: true; counts: { id: string; likes: number; reposts: number; replies: number }[] }
  | { ok: false; reason: string };

function allowRead(): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0]! > WINDOW_MS) hits.shift();
  if (hits.length >= MAX_READS) return false;
  hits.push(now);
  return true;
}

function statusIdFromUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!STATUS_HOSTS.has(url.hostname.replace(/^www\./, ""))) return null;
  const match = url.pathname.match(/\/status\/(\d{8,22})\/?$/);
  return match?.[1] ?? null;
}

type FxTweet = {
  id?: string;
  text?: string;
  created_at?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  author?: { screen_name?: string; name?: string; protected?: boolean };
};

function parseTweet(payload: unknown): PublicRead {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "The public reader returned something we could not use." };
  }
  const body = payload as { code?: number; tweet?: FxTweet };
  if (body.code && body.code !== 200) {
    return { ok: false, reason: "That public post could not be read. It may be deleted or protected." };
  }
  const tweet = body.tweet;
  if (!tweet?.id || !tweet.text || !tweet.author?.screen_name) {
    return { ok: false, reason: "No public post text came back." };
  }
  if (tweet.author.protected) {
    return { ok: false, reason: "That account is protected. This reader only accepts public posts." };
  }
  const created = tweet.created_at ? new Date(tweet.created_at) : null;
  const handle = tweet.author.screen_name.replace(/^@/, "");
  return {
    ok: true,
    post: {
      id: String(tweet.id),
      handle,
      name: tweet.author.name?.slice(0, 80) || handle,
      text: tweet.text.slice(0, 2000),
      createdAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : new Date().toISOString(),
      likes: Number(tweet.likes) || 0,
      reposts: Number(tweet.retweets) || 0,
      replies: Number(tweet.replies) || 0,
      url: `https://x.com/${handle}/status/${tweet.id}`,
    },
  };
}

async function fetchStatus(id: string): Promise<PublicRead> {
  if (!allowRead()) {
    return { ok: false, reason: "Rate cap reached. Wait a minute before the next public read." };
  }
  const response = await fetch(`https://api.fxtwitter.com/i/status/${id}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: "That post is not available without a login. Skipping it." };
  }
  if (response.status === 404) {
    return { ok: false, reason: "No public post at that link." };
  }
  if (!response.ok) {
    return { ok: false, reason: "The public post service refused this read. The brief keeps its last copy." };
  }
  return parseTweet(await response.json());
}

export async function fetchPublicPost({ data }: { data: string }): Promise<PublicRead> {
  const id = statusIdFromUrl(data);
  if (!id) {
    return {
      ok: false,
      reason: "Paste one public post link, like https://x.com/name/status/123. Profiles and search pages are not read.",
    };
  }
  try {
    return await fetchStatus(id);
  } catch {
    return { ok: false, reason: "The public read timed out. Nothing was stored." };
  }
}

export async function refreshPublicCounts({ data }: { data: { ids: string[] } }): Promise<CountRead> {
  const unique = [...new Set(data.ids)].slice(0, 4).filter((id) => /^\d{8,22}$/.test(id));
  if (unique.length === 0) return { ok: false, reason: "Nothing to refresh." };
  const counts: { id: string; likes: number; reposts: number; replies: number }[] = [];
  for (const id of unique) {
    try {
      const read = await fetchStatus(id);
      if (read.ok) {
        counts.push({
          id: read.post.id,
          likes: read.post.likes,
          reposts: read.post.reposts,
          replies: read.post.replies,
        });
      }
    } catch {
      // Keep the last public copy for this id.
    }
  }
  if (counts.length === 0) {
    return { ok: false, reason: "Public counts could not be refreshed. Showing the collected copy." };
  }
  return { ok: true, counts };
}
