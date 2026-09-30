import { guessOems, oemById, type OemId } from "@/data/oems";
import type { ScoredPost } from "@/lib/aggregate";
import { netPoints, scoreText, THEMES, themesIn, type Hit, type Pole, type ThemeId } from "@/lib/sentiment";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "was", "were", "have", "has", "had",
  "our", "you", "your", "about", "into", "over", "after", "before", "while", "just", "been",
  "they", "their", "them", "then", "than", "when", "what", "which", "who", "how", "not",
  "but", "are", "its", "it's", "a", "an", "of", "to", "in", "on", "at", "by", "or", "as",
  "is", "it", "we", "my", "me", "i", "be", "if", "so", "very", "really", "flight", "flights",
]);

export type NoteMatch = {
  post: ScoredPost;
  sharedHits: string[];
  sharedThemes: string[];
  sharedWords: string[];
};

export type NoteLink = {
  label: Pole;
  net: number;
  hits: Hit[];
  themes: ThemeId[];
  oems: OemId[];
  matches: NoteMatch[];
  historyLine: string;
  historyNet: number | null;
  historyCount: number;
};

function tokens(text: string): string[] {
  const found = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  const unique: string[] = [];
  for (const word of found) {
    if (STOP.has(word) || unique.includes(word)) continue;
    unique.push(word);
  }
  return unique;
}

function themeLabel(id: ThemeId): string {
  return THEMES.find((theme) => theme.id === id)?.label ?? id;
}

export function connectNote(text: string, history: ScoredPost[]): NoteLink {
  const trimmed = text.trim();
  const scored = scoreText(trimmed);
  const themes = themesIn(trimmed);
  const oems = guessOems(trimmed);
  const hitTerms = new Set(scored.hits.map((hit) => hit.term));
  const words = tokens(trimmed);

  const ranked = history
    .map((post) => {
      const sharedHits = [...new Set(post.hits.filter((hit) => hitTerms.has(hit.term)).map((hit) => hit.term))];
      const sharedThemes = post.themes.filter((theme) => themes.includes(theme));
      const postWords = new Set(tokens(post.text));
      const sharedWords = words.filter((word) => postWords.has(word) && !hitTerms.has(word)).slice(0, 6);
      const sameOem = oems.length === 0 ? false : oems.some((id) => post.oem === id || post.also.includes(id));
      const overlap =
        sharedHits.length * 3 + sharedThemes.length * 2 + Math.min(sharedWords.length, 4) + (sameOem ? 2 : 0);
      return { post, sharedHits, sharedThemes, sharedWords, sameOem, overlap };
    })
    .filter((row) => {
      if (row.overlap < 4) return false;
      if (row.sharedHits.length > 0) return true;
      if (row.sameOem && (row.sharedThemes.length > 0 || row.sharedWords.length >= 2)) return true;
      return row.sharedThemes.length > 0 && row.sharedWords.length >= 2;
    })
    .sort((a, b) => b.overlap - a.overlap || Date.parse(a.post.createdAt) - Date.parse(b.post.createdAt));

  const pool = ranked.filter((row) => (oems.length === 0 ? true : row.sameOem));
  const used = (pool.length > 0 ? pool : ranked).slice(0, 4);
  const historyCount = pool.length > 0 ? pool.length : ranked.length;
  const historyNet =
    historyCount === 0
      ? null
      : Math.round(
          (pool.length > 0 ? pool : ranked).reduce((sum, row) => sum + row.post.score, 0) / historyCount * 100,
        );

  const net = netPoints(scored.score);
  const oemNames = oems.map((id) => oemById(id).name);
  const sharedHitList = [...new Set(used.flatMap((row) => row.sharedHits))];
  const sharedThemeList = [...new Set(used.flatMap((row) => row.sharedThemes))].map(themeLabel);

  let historyLine: string;
  if (trimmed.length < 12) {
    historyLine = "Write a few sentences about the flight. The score uses the same word list as the cards.";
  } else if (used.length === 0) {
    historyLine = oemNames.length
      ? `Nothing else in this sample shares ${oemNames.join(" / ")} and a scored word or theme with this note. The score still stands on its own.`
      : "No maker name in the note, and no earlier card shares a scored word. Name the aircraft or the airline's type if you want a tie to the sample.";
  } else {
    const closest = used[0]?.post;
    const lean =
      historyNet === null
        ? ""
        : net > historyNet + 8
          ? ` This note is warmer than those cards (their net is ${historyNet > 0 ? `+${historyNet}` : historyNet}).`
          : net < historyNet - 8
            ? ` This note is colder than those cards (their net is ${historyNet > 0 ? `+${historyNet}` : historyNet}).`
            : ` This note sits near those cards (their net is ${historyNet > 0 ? `+${historyNet}` : historyNet}).`;
    const bridge = [
      sharedThemeList.length ? `Shared themes: ${sharedThemeList.join(", ")}.` : "",
      sharedHitList.length ? `Shared scored words: ${sharedHitList.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const who = closest
      ? ` Closest earlier post: @${closest.handle} on ${closest.createdAt.slice(0, 10)}.`
      : "";
    const about = oemNames.length ? oemNames.join(" / ") : "the same words";
    historyLine = `${historyCount} earlier public ${historyCount === 1 ? "post" : "posts"} about ${about} connect to this note. ${bridge}${who}${lean}`;
  }

  return {
    label: scored.label,
    net,
    hits: scored.hits,
    themes,
    oems,
    matches: used.map(({ post, sharedHits, sharedThemes, sharedWords }) => ({
      post,
      sharedHits,
      sharedThemes: sharedThemes.map(themeLabel),
      sharedWords,
    })),
    historyLine,
    historyNet,
    historyCount: used.length === 0 ? 0 : historyCount,
  };
}
