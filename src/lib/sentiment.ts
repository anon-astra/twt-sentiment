export type Pole = "positive" | "negative" | "neutral";

export type Hit = {
  term: string;
  weight: number;
  pole: "positive" | "negative";
};

export type Score = {
  score: number;
  label: Pole;
  hits: Hit[];
};

const POSITIVE: { term: string; weight: number; how?: "word" }[] = [
  { term: "maiden", weight: 1.8 },
  { term: "first flight", weight: 2 },
  { term: "deliver", weight: 1.3 },
  { term: "certif", weight: 1.5 },
  { term: "order", weight: 1.1 },
  { term: "select", weight: 1.2 },
  { term: "milestone", weight: 1.4 },
  { term: "boost", weight: 1 },
  { term: "hiring", weight: 0.8 },
  { term: "partnership", weight: 1 },
  { term: "partner", weight: 0.8 },
  { term: "record", weight: 0.7 },
  { term: "modern", weight: 0.5 },
  { term: "efficient", weight: 0.6 },
  { term: "smooth", weight: 1.3 },
  { term: "comfort", weight: 1.3 },
  { term: "pleasant", weight: 1.2 },
  { term: "excellent", weight: 1.5 },
  { term: "wonderful", weight: 1.5 },
  { term: "amazing", weight: 1.3 },
  { term: "loved", weight: 1.3 },
  { term: "lovely", weight: 1.2 },
  { term: "enjoy", weight: 1.1 },
  { term: "friendly", weight: 1.1 },
  { term: "spacious", weight: 1.2 },
  { term: "quiet", weight: 0.9, how: "word" },
  { term: "punctual", weight: 1.3 },
  { term: "flawless", weight: 1.5 },
  { term: "on time", weight: 1.4 },
  { term: "recommend", weight: 1.1 },
  { term: "impressed", weight: 1.2 },
  { term: "uneventful", weight: 0.8 },
  { term: "relax", weight: 1 },
  { term: "polite", weight: 1 },
  { term: "helpful", weight: 0.9 },
  { term: "great", weight: 1.1, how: "word" },
  { term: "good", weight: 0.9, how: "word" },
  { term: "nice", weight: 0.9, how: "word" },
  { term: "best", weight: 1, how: "word" },
  { term: "superb", weight: 1.4 },
  { term: "decent", weight: 0.7 },
  { term: "clean", weight: 0.7, how: "word" },
  { term: "gentle", weight: 0.8 },
];

const NEGATIVE: { term: string; weight: number; how?: "word" }[] = [
  { term: "defect", weight: 2 },
  { term: "quality issue", weight: 2 },
  { term: "quality defect", weight: 2 },
  { term: "emergency", weight: 1.7 },
  { term: "hijack", weight: 1.6 },
  { term: "lawsuit", weight: 1.8 },
  { term: "suing", weight: 1.6 },
  { term: "sued", weight: 1.6 },
  { term: "stall", weight: 1.4 },
  { term: "delay", weight: 1.1 },
  { term: "slower", weight: 1.1 },
  { term: "incident", weight: 1.2 },
  { term: "abort", weight: 1.1 },
  { term: "headwind", weight: 1.1 },
  { term: "problem", weight: 0.9 },
  { term: "divert", weight: 1 },
  { term: "denied", weight: 1.2 },
  { term: "scandal", weight: 1.7 },
  { term: "halted", weight: 1.5 },
  { term: "warning", weight: 0.9 },
  { term: "failure", weight: 1.4 },
  { term: "blew a hole", weight: 1.6 },
  { term: "turbulen", weight: 1.5 },
  { term: "bumpy", weight: 1.2 },
  { term: "rough", weight: 1.1, how: "word" },
  { term: "cancel", weight: 1.5 },
  { term: "cramped", weight: 1.3 },
  { term: "rude", weight: 1.3, how: "word" },
  { term: "uncomfort", weight: 1.4 },
  { term: "scary", weight: 1.3 },
  { term: "scared", weight: 1.3 },
  { term: "fright", weight: 1.3 },
  { term: "awful", weight: 1.5 },
  { term: "terrible", weight: 1.5 },
  { term: "horrible", weight: 1.5 },
  { term: "worst", weight: 1.4, how: "word" },
  { term: "vomit", weight: 1.5 },
  { term: "nause", weight: 1.4 },
  { term: "stranded", weight: 1.3 },
  { term: "overbook", weight: 1.3 },
  { term: "dirty", weight: 1, how: "word" },
  { term: "smell", weight: 0.9 },
  { term: "anxi", weight: 1.1 },
  { term: "panic", weight: 1.4 },
  { term: "hard landing", weight: 1.5 },
  { term: "go-around", weight: 1.2 },
  { term: "go around", weight: 1.2 },
  { term: "late", weight: 1, how: "word" },
  { term: "disappoint", weight: 1.2 },
  { term: "frustrat", weight: 1.1 },
  { term: "nightmare", weight: 1.5 },
  { term: "loud", weight: 0.8, how: "word" },
  { term: "shak", weight: 1 },
  { term: "missed", weight: 1.1 },
  { term: "lost bag", weight: 1.3 },
  { term: "lost luggage", weight: 1.4 },
  { term: "tarmac", weight: 0.8 },
  { term: "poor", weight: 1.1, how: "word" },
  { term: "bad", weight: 1, how: "word" },
  { term: "waited", weight: 0.8 },
  { term: "boring", weight: 0.7 },
  { term: "crowded", weight: 0.9 },
];

export const THEMES = [
  { id: "orders", label: "Orders", pattern: /\b(order|orders|selects|selected|tender|contract)\b/i },
  { id: "deliveries", label: "Deliveries", pattern: /\b(deliver\w*|maiden|first flight)\b/i },
  { id: "safety", label: "Safety & quality", pattern: /\b(emergency|incident|defect|quality|abort|divert\w*|7700|7500|failure|turbulen\w*|scary|scared|panic|vomit\w*|hard landing|go-around|go around)\b/i },
  { id: "industrial", label: "Industry", pattern: /\b(manufactur\w*|assembly|partner\w*|certif\w*|carbon fiber)\b/i },
  { id: "people", label: "People", pattern: /\b(hiring|jobs?|sued|suing|eeoc|crews?|pilots?|attendants?|staff|passengers?|rude|friendly)\b/i },
  { id: "network", label: "Network", pattern: /\b(route|routes|flights?|service|airline|cancel\w*|tarmac|boarding|landed|landing|connection)\b/i },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

function collect(text: string, table: { term: string; weight: number; how?: "word" }[], pole: Hit["pole"]): Hit[] {
  const lower = text.toLowerCase();
  const hits: Hit[] = [];
  for (const row of table) {
    const found = findTerm(lower, row.term, row.how ?? "stem");
    if (found < 0) continue;
    const flipped = negated(lower, found);
    hits.push({
      term: row.term,
      weight: row.weight,
      pole: flipped ? (pole === "positive" ? "negative" : "positive") : pole,
    });
  }
  return hits;
}

function findTerm(lower: string, term: string, how: "stem" | "word"): number {
  if (how === "stem") return lower.indexOf(term);
  const match = new RegExp(`(?:^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`).exec(lower);
  if (!match) return -1;
  return match.index + (match[0].length - term.length);
}

function negated(lower: string, index: number): boolean {
  const window = lower.slice(Math.max(0, index - 28), index);
  return /\b(not|no|never|without|wasn.?t|isn.?t|weren.?t|don.?t|didn.?t|hardly|barely)(?:\s+[a-z']+){0,2}\s+$/.test(window);
}

export function scoreText(text: string): Score {
  const hits = [
    ...collect(text, POSITIVE, "positive"),
    ...collect(text, NEGATIVE, "negative"),
  ];
  const raw = hits.reduce((sum, hit) => sum + (hit.pole === "positive" ? hit.weight : -hit.weight), 0);
  const score = Math.max(-1, Math.min(1, raw / (2.4 + hits.length * 0.35)));
  const label: Pole = score > 0.12 ? "positive" : score < -0.12 ? "negative" : "neutral";
  return { score, label, hits };
}

export function themesIn(text: string): ThemeId[] {
  return THEMES.filter((theme) => theme.pattern.test(text)).map((theme) => theme.id);
}

export function netPoints(score: number): number {
  return Math.round(score * 100);
}
