export const OEM_IDS = ["airbus", "boeing", "embraer", "comac", "atr", "bombardier"] as const;

export type OemId = (typeof OEM_IDS)[number];

export type Oem = {
  id: OemId;
  name: string;
  code: string;
  base: string;
  programs: string;
};

export const OEMS: Oem[] = [
  {
    id: "airbus",
    name: "Airbus",
    code: "AB",
    base: "Toulouse",
    programs: "A220 · A320neo · A350",
  },
  {
    id: "boeing",
    name: "Boeing",
    code: "BA",
    base: "Arlington",
    programs: "737 MAX · 787 · 777F",
  },
  {
    id: "embraer",
    name: "Embraer",
    code: "EMB",
    base: "São José dos Campos",
    programs: "E2 · Phenom · C-390",
  },
  {
    id: "comac",
    name: "COMAC",
    code: "COM",
    base: "Shanghai",
    programs: "C909 · C919 · C929",
  },
  {
    id: "atr",
    name: "ATR",
    code: "ATR",
    base: "Toulouse",
    programs: "ATR 42 · ATR 72",
  },
  {
    id: "bombardier",
    name: "Bombardier",
    code: "BBD",
    base: "Montréal",
    programs: "Global · Challenger",
  },
];

export function oemById(id: OemId): Oem {
  const found = OEMS.find((oem) => oem.id === id);
  if (!found) throw new Error(`Unknown OEM ${id}`);
  return found;
}

const RULES: { id: OemId; pattern: RegExp }[] = [
  { id: "airbus", pattern: /\b(airbus|a220|a320\w*|a321\w*|a330|a350\w*|a380)\b/i },
  { id: "boeing", pattern: /\b(boeing|737|787|777|767|kc-46)\b/i },
  { id: "embraer", pattern: /\b(embraer|phenom|e175|e190|e195|\be2\b|c-390|kc-390)\b/i },
  { id: "comac", pattern: /\b(comac|c919|c909|c929|arj21)\b/i },
  { id: "atr", pattern: /\b(atr\s?-?\s?72|atr\s?-?\s?42|atr)\b/i },
  { id: "bombardier", pattern: /\b(bombardier|global\s?6000|global\s?7500|global\s?8000|challenger)\b/i },
];

export function guessOems(text: string): OemId[] {
  return RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.id);
}
