import type { OemId } from "@/data/oems";
import { OEMS } from "@/data/oems";
import { netPoints, scoreText, themesIn, THEMES, type Pole, type ThemeId } from "@/lib/sentiment";

export type BriefPost = {
  id: string;
  oem: OemId;
  also: OemId[];
  handle: string;
  name: string;
  text: string;
  createdAt: string;
  likes: number;
  reposts: number;
  replies: number;
  query?: string;
  live?: boolean;
};

export type ScoredPost = BriefPost & {
  score: number;
  label: Pole;
  hits: { term: string; weight: number; pole: "positive" | "negative" }[];
  themes: ThemeId[];
  net: number;
};

export type OemRollup = {
  id: OemId;
  name: string;
  code: string;
  n: number;
  net: number;
  positiveShare: number;
  topTheme: string;
  thin: boolean;
};

export function mentions(post: BriefPost, oem: OemId): boolean {
  return post.oem === oem || post.also.includes(oem);
}

export function scorePost(post: BriefPost): ScoredPost {
  const scored = scoreText(post.text);
  return {
    ...post,
    score: scored.score,
    label: scored.label,
    hits: scored.hits,
    themes: themesIn(post.text),
    net: netPoints(scored.score),
  };
}

export function forOem(posts: ScoredPost[], oem: OemId | "all"): ScoredPost[] {
  const matched = oem === "all" ? posts : posts.filter((post) => mentions(post, oem));
  return [...matched].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function meanNet(posts: ScoredPost[]): number {
  if (posts.length === 0) return 0;
  const avg = posts.reduce((sum, post) => sum + post.score, 0) / posts.length;
  return netPoints(avg);
}

function topTheme(posts: ScoredPost[]): string {
  const counts = new Map<ThemeId, number>();
  for (const post of posts) {
    for (const theme of post.themes) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  let best: ThemeId | null = null;
  let bestN = 0;
  for (const [theme, n] of counts) {
    if (n > bestN) {
      best = theme;
      bestN = n;
    }
  }
  if (!best) return "Quiet";
  return THEMES.find((theme) => theme.id === best)?.label ?? "Quiet";
}

export function rollupOem(posts: ScoredPost[], oem: OemId): OemRollup {
  const slice = posts.filter((post) => mentions(post, oem));
  const meta = OEMS.find((item) => item.id === oem);
  const positive = slice.filter((post) => post.label === "positive").length;
  return {
    id: oem,
    name: meta?.name ?? oem,
    code: meta?.code ?? oem,
    n: slice.length,
    net: meanNet(slice),
    positiveShare: slice.length ? Math.round((positive / slice.length) * 100) : 0,
    topTheme: topTheme(slice),
    thin: slice.length < 5,
  };
}

export function rollupAll(posts: ScoredPost[]): OemRollup[] {
  return OEMS.map((oem) => rollupOem(posts, oem.id));
}

export function themeCounts(posts: ScoredPost[]): { id: ThemeId; label: string; n: number }[] {
  return THEMES.map((theme) => ({
    id: theme.id,
    label: theme.label,
    n: posts.filter((post) => post.themes.includes(theme.id)).length,
  }));
}

export function toneLabel(net: number): Pole {
  if (net > 12) return "positive";
  if (net < -12) return "negative";
  return "neutral";
}
