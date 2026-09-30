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

const POSITIVE: { term: string; weight: number }[] = [
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
];

const NEGATIVE: { term: string; weight: number }[] = [
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
];

export const THEMES = [
  { id: "orders", label: "Orders", pattern: /\b(order|orders|selects|selected|tender|contract)\b/i },
  { id: "deliveries", label: "Deliveries", pattern: /\b(deliver\w*|maiden|first flight)\b/i },
  { id: "safety", label: "Safety & quality", pattern: /\b(emergency|incident|defect|quality|abort|divert\w*|7700|7500|failure)\b/i },
  { id: "industrial", label: "Industry", pattern: /\b(manufactur\w*|assembly|partner\w*|certif\w*|carbon fiber)\b/i },
  { id: "people", label: "People", pattern: /\b(hiring|jobs?|sued|suing|eeoc|crews?|pilots?)\b/i },
  { id: "network", label: "Network", pattern: /\b(route|routes|flights?|service|airline)\b/i },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

function collect(text: string, table: { term: string; weight: number }[], pole: Hit["pole"]): Hit[] {
  const lower = text.toLowerCase();
  const hits: Hit[] = [];
  for (const row of table) {
    if (lower.includes(row.term)) hits.push({ term: row.term, weight: row.weight, pole });
  }
  return hits;
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
