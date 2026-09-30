export const COLLECTED_AT = "2026-09-30T08:20:00.000Z";

export const PUBLIC_QUERIES = [
  "Airbus / A320 / A350 delivery, order, delay, defect",
  "Boeing / 737 / 787 delivery, FAA, order",
  "Embraer E2, Phenom, C-390",
  "COMAC / C919 certification and flights",
  "ATR 72 / ATR 42",
  "Bombardier / Global 6000",
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
