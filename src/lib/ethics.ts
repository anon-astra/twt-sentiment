export const COLLECTED_AT = "2026-09-30T08:40:00.000Z";
export const WINDOW_START = "2025-07-01T00:00:00.000Z";

export const PUBLIC_QUERIES = [
  "1 Jul 2025 – 30 Sep 2026, original English posts, compiled sample",
  "Airbus / A320 / A350 / A220 delivery, order, delay",
  "Boeing / 737 / 787 delivery, FAA, order",
  "Embraer E2, C-390, Phenom",
  "COMAC / C919 certification and deliveries",
  "ATR 72 / ATR 42 orders and flights",
  "Bombardier Global and Challenger",
] as const;

export const READER_RULES = {
  allows: [
    "Public posts only. If an account is protected, the read stops.",
    "One status link at a time, or a refresh of at most four posts already on screen.",
    "An identified reader name. No login, cookies, or session impersonation.",
    "A hard cap of eight upstream reads a minute, then a wait.",
    "Only the post id, public name, handle, text, time, and public counts.",
  ],
  refuses: [
    "Direct messages, protected accounts, and anything behind a login wall.",
    "Follower, following, or likes graphs.",
    "Open-ended crawling or repeating a search in a loop.",
    "Treating the score as a safety rating, a poll, or investment advice.",
  ],
} as const;
