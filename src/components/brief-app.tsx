import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink, Moon, Plane, RefreshCw, Sun } from "lucide-react";
import { OEMS, guessOems, oemById, type OemId } from "@/data/oems";
import { SEED_POSTS } from "@/data/corpus";
import { COLLECTED_AT, PUBLIC_QUERIES, READER_RULES } from "@/lib/ethics";
import {
  forOem,
  rollupAll,
  rollupOem,
  scorePost,
  themeCounts,
  toneLabel,
  type BriefPost,
  type OemRollup,
  type ScoredPost,
} from "@/lib/aggregate";
import type { Pole } from "@/lib/sentiment";
import { fetchPublicPost, refreshPublicCounts } from "@/lib/public-read";

const PIN_KEY = "airframe-brief-pins";
const HIDE_KEY = "airframe-brief-hidden";
const THEME_KEY = "airframe-brief-theme";

function formatUtc(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const SEED: BriefPost[] = SEED_POSTS.map((post) => ({
  ...post,
  also: post.also ?? [],
}));

function toneText(label: Pole): string {
  if (label === "positive") return "text-positive";
  if (label === "negative") return "text-negative";
  return "text-muted";
}

function toneFill(net: number): string {
  if (net > 12) return "var(--color-positive)";
  if (net < -12) return "var(--color-negative)";
  return "var(--color-accent)";
}

function Meter({ net }: { net: number }) {
  const clamped = Math.max(-100, Math.min(100, net));
  const left = ((clamped + 100) / 200) * 100;
  return (
    <div className="relative h-1.5 rounded-full bg-line" aria-hidden="true">
      <span className="absolute top-1/2 left-1/2 h-1.5 w-px -translate-y-1/2 bg-muted" />
      <span
        className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `calc(${left}% - 5px)` }}
      />
    </div>
  );
}

function SentimentChart({ rows, active }: { rows: OemRollup[]; active: OemId | "all" }) {
  const data = rows.map((row) => ({
    name: row.code,
    net: row.net,
    id: row.id,
    label: row.name,
  }));
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[-100, 100]}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-fg) 6%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: 12,
              color: "var(--color-fg)",
              fontSize: 13,
            }}
            formatter={(value, _name, item) => {
              const label = (item?.payload as { label?: string } | undefined)?.label ?? "Net";
              return [`${value}`, label];
            }}
          />
          <Bar dataKey="net" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={toneFill(entry.net)}
                opacity={active === "all" || active === entry.id ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ThemeChart({ posts }: { posts: ScoredPost[] }) {
  const data = themeCounts(posts);
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-fg) 6%, transparent)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: 12,
              color: "var(--color-fg)",
              fontSize: 13,
            }}
            formatter={(value) => [`${value} posts`, "Mentions"]}
          />
          <Bar dataKey="n" fill="var(--color-accent)" radius={[0, 6, 6, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BriefApp() {
  const [oem, setOem] = useState<OemId | "all">("all");
  const [pins, setPins] = useState<BriefPost[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { likes: number; reposts: number; replies: number }>>(
    {},
  );
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"read" | "refresh" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [span, setSpan] = useState<"all" | "2025" | "2026">("all");

  useEffect(() => {
    try {
      const storedPins = localStorage.getItem(PIN_KEY);
      const storedHidden = localStorage.getItem(HIDE_KEY);
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedPins) setPins(JSON.parse(storedPins) as BriefPost[]);
      if (storedHidden) setHidden(JSON.parse(storedHidden) as string[]);
      if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
    } catch {
      // Ignore a corrupt local brief. The public sample still renders.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f7f3" : "#101410");
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
  }, [pins, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HIDE_KEY, JSON.stringify(hidden));
  }, [hidden, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  const posts = useMemo(() => {
    const byId = new Map<string, BriefPost>();
    for (const post of SEED) byId.set(post.id, post);
    for (const post of pins) byId.set(post.id, post);
    return [...byId.values()]
      .filter((post) => !hidden.includes(post.id))
      .map((post) => {
        const fresh = overrides[post.id];
        return fresh ? { ...post, ...fresh } : post;
      })
      .map(scorePost);
  }, [pins, hidden, overrides]);

  const ranged = useMemo(() => {
    if (span === "all") return posts;
    return posts.filter((post) => post.createdAt.startsWith(span));
  }, [posts, span]);

  const board = useMemo(() => rollupAll(ranged), [ranged]);
  const view = useMemo(() => forOem(ranged, oem), [ranged, oem]);
  const focus = oem === "all" ? null : rollupOem(posts, oem);
  const overallNet =
    ranged.length === 0 ? 0 : Math.round(ranged.reduce((sum, post) => sum + post.score, 0) / ranged.length * 100);
  const positiveShare = posts.length
    ? Math.round((view.filter((post) => post.label === "positive").length / view.length) * 100)
    : 0;
  const themeLead = themeCounts(view).reduce(
    (best, row) => (row.n > best.n ? row : best),
    { label: "Quiet", n: 0 },
  );
  const loudest = themeLead.n > 0 ? themeLead.label : "Quiet";

  async function readLink(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy("read");
    setNotice(null);
    try {
      const result = await fetchPublicPost({ data: draft.trim() });
      if (!result.ok) {
        setNotice(result.reason);
        return;
      }
      const guessed = guessOems(result.post.text);
      if (guessed.length === 0) {
        setNotice("Read, but not filed. The text does not name Airbus, Boeing, Embraer, COMAC, ATR, or Bombardier.");
        return;
      }
      const [primary, ...rest] = guessed;
      if (!primary) return;
      const next: BriefPost = {
        id: result.post.id,
        oem: primary,
        also: rest,
        handle: result.post.handle,
        name: result.post.name,
        text: result.post.text,
        createdAt: result.post.createdAt,
        likes: result.post.likes,
        reposts: result.post.reposts,
        replies: result.post.replies,
        live: true,
      };
      setPins((current) => [next, ...current.filter((post) => post.id !== next.id)]);
      setHidden((current) => current.filter((id) => id !== next.id));
      setOem(primary);
      setDraft("");
      setNotice(`Filed under ${oemById(primary).name}. Public post only.`);
    } catch {
      setNotice("The public read failed. Nothing new was stored.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshCounts() {
    if (busy) return;
    const ids = view.slice(0, 4).map((post) => post.id);
    if (ids.length === 0) return;
    setBusy("refresh");
    setNotice(null);
    try {
      const result = await refreshPublicCounts({ data: { ids } });
      if (!result.ok) {
        setNotice(result.reason);
        return;
      }
      setOverrides((current) => {
        const next = { ...current };
        for (const count of result.counts) {
          next[count.id] = { likes: count.likes, reposts: count.reposts, replies: count.replies };
        }
        return next;
      });
      setNotice(`Updated public counts on ${result.counts.length} post${result.counts.length === 1 ? "" : "s"}.`);
    } catch {
      setNotice("Count refresh failed. Showing the collected copy.");
    } finally {
      setBusy(null);
    }
  }

  const collectedLabel = formatUtc(COLLECTED_AT);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6">
      <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 font-mono text-xs tracking-widest text-accent uppercase">
            <Plane className="size-4" aria-hidden="true" />
            Airframe Brief
          </p>
          <h1 className="mt-2 text-3xl text-balance text-fg sm:text-4xl">
            What public posts say about each airframe maker
          </h1>
          <p className="mt-3 text-pretty text-muted">
            Airbus, Boeing, and four peers, from 1 Jul 2025 through 30 Sep 2026. Scores come from a
            visible word list, not a hidden model. Not a poll and not a safety rating.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg"
          >
            {theme === "light" ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <dl className="grid grid-cols-3 gap-3 sm:min-w-72">
          <div>
            <dt className="font-mono text-xs tracking-wide text-muted uppercase">Posts</dt>
            <dd className="mt-1 text-2xl tabular-nums">{ranged.length}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs tracking-wide text-muted uppercase">OEMs</dt>
            <dd className="mt-1 text-2xl tabular-nums">{OEMS.length}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs tracking-wide text-muted uppercase">Net</dt>
            <dd className={`mt-1 text-2xl tabular-nums ${toneText(toneLabel(overallNet))}`}>
              {overallNet > 0 ? `+${overallNet}` : overallNet}
            </dd>
          </div>
        </dl>
        </div>
      </header>

      <section className="mt-6" aria-label="How posts are read">
        <ul className="grid gap-2 sm:grid-cols-4">
          {[
            "Public posts only",
            "No login, no graph crawl",
            "Eight reads a minute",
            "Every post links out",
          ].map((rule) => (
            <li key={rule} className="rounded-2xl border border-line bg-surface px-3 py-3 text-sm text-fg">
              {rule}
            </li>
          ))}
        </ul>
        <details className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="text-sm font-medium text-fg">Collection rules and the queries behind this sample</summary>
          <div className="mt-4 grid gap-6 text-sm text-muted sm:grid-cols-2">
            <div>
              <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Will do</h2>
              <ul className="mt-2 space-y-2">
                {READER_RULES.allows.map((rule) => (
                  <li key={rule} className="text-pretty">{rule}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Will not do</h2>
              <ul className="mt-2 space-y-2">
                {READER_RULES.refuses.map((rule) => (
                  <li key={rule} className="text-pretty">{rule}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Public queries in this sample</h2>
            <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
              {PUBLIC_QUERIES.map((query) => (
                <li key={query}>{query}</li>
              ))}
            </ul>
            <p className="mt-3 text-pretty text-sm text-muted">
              Original English public posts from 1 Jul 2025 through {collectedLabel}. Not every post in that
              window. Hiding a card only removes it from this browser. Refresh asks the public post
              service for new like counts on at most four posts.
            </p>
          </div>
        </details>
      </section>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Date range">
        {(
          [
            ["all", "1 Jul 2025 – 30 Sep 2026"],
            ["2025", "2025"],
            ["2026", "2026"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={span === id}
            onClick={() => setSpan(id)}
            className={`min-h-11 rounded-full border px-4 text-sm ${
              span === id ? "border-accent bg-accent text-bg" : "border-line bg-surface text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Airframe makers">
        <button
          type="button"
          role="tab"
          aria-selected={oem === "all"}
          onClick={() => setOem("all")}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
            oem === "all" ? "border-accent bg-accent text-bg" : "border-line bg-surface text-fg"
          }`}
        >
          All makers
        </button>
        {OEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={oem === item.id}
            onClick={() => setOem(item.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
              oem === item.id ? "border-accent bg-accent text-bg" : "border-line bg-surface text-fg"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {focus ? (
        <p className="mt-4 text-sm text-pretty text-muted">
          <span className="text-fg">{focus.name}</span>
          {" · "}
          {oemById(focus.id).base}
          {" · "}
          {oemById(focus.id).programs}
          {focus.thin ? " · Thin public sample. Read the posts, not just the number." : null}
        </p>
      ) : null}

      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Current slice">
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Net in view</p>
          <p className={`mt-2 text-3xl tabular-nums ${toneText(toneLabel(focus?.net ?? overallNet))}`}>
            {(focus?.net ?? overallNet) > 0 ? `+${focus?.net ?? overallNet}` : (focus?.net ?? overallNet)}
          </p>
          <div className="mt-3">
            <Meter net={focus?.net ?? overallNet} />
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Positive share</p>
          <p className="mt-2 text-3xl tabular-nums">{positiveShare}%</p>
          <p className="mt-2 text-sm text-muted">{view.length} public posts in this slice</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loudest theme</p>
          <p className="mt-2 text-3xl text-balance">{loudest ?? "Quiet"}</p>
          <p className="mt-2 text-sm text-muted">From words in the posts, not a topic model</p>
        </article>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-5">
        <article className="rounded-2xl border border-line bg-surface p-4 lg:col-span-3">
          <h2 className="text-sm font-medium">Net sentiment by OEM</h2>
          <p className="mt-1 text-sm text-muted">−100 is sour, +100 is warm. Brass is near even.</p>
          <SentimentChart rows={board} active={oem} />
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4 lg:col-span-2">
          <h2 className="text-sm font-medium">Themes in this slice</h2>
          <p className="mt-1 text-sm text-muted">A post can sit in more than one.</p>
          <ThemeChart posts={view} />
        </article>
      </section>

      <section className="mt-4 overflow-x-auto rounded-2xl border border-line" aria-label="OEM comparison">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="bg-surface font-mono text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Maker</th>
              <th className="px-4 py-3 font-medium">Posts</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Meter</th>
              <th className="px-4 py-3 font-medium">Theme</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-line ${oem === row.id ? "bg-surface" : "bg-bg"}`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOem(row.id)}
                    className="min-h-11 text-left font-medium"
                  >
                    {row.name}
                    <span className="ml-2 font-mono text-xs text-muted">{row.code}</span>
                  </button>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.n}
                  {row.thin ? <span className="ml-2 text-muted">thin</span> : null}
                </td>
                <td className={`px-4 py-3 tabular-nums ${toneText(toneLabel(row.net))}`}>
                  {row.net > 0 ? `+${row.net}` : row.net}
                </td>
                <td className="w-40 px-4 py-3">
                  <Meter net={row.net} />
                </td>
                <td className="px-4 py-3 text-muted">{row.topTheme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8" aria-label="Public posts">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl text-balance">Public posts</h2>
            <p className="mt-1 text-sm text-muted">Newest first. Matched words are the whole score.</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshCounts()}
            disabled={busy !== null || view.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${busy === "refresh" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            Refresh 4 public counts
          </button>
        </div>

        <form onSubmit={(event) => void readLink(event)} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="post-url">
            Public post link
          </label>
          <input
            id="post-url"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://x.com/name/status/…"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-11 w-full rounded-full border border-line bg-surface px-4 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy !== null || draft.trim().length < 12}
            className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-bg disabled:opacity-50"
          >
            {busy === "read" ? "Reading…" : "Read public post"}
          </button>
        </form>
        {notice ? (
          <p className="mt-2 text-sm text-muted" role="status">
            {notice}
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {view.map((post) => {
            const open = openId === post.id;
            const names = [oemById(post.oem).name, ...post.also.map((id) => oemById(id).name)];
            return (
              <li key={post.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-medium">{post.name}</span>
                    <span className="text-muted"> @{post.handle}</span>
                  </p>
                  <p className="font-mono text-xs text-muted">{formatUtc(post.createdAt)}</p>
                </div>
                <p className={`mt-3 text-pretty leading-relaxed ${open ? "" : "line-clamp-4"}`}>{post.text}</p>
                {post.text.length > 180 ? (
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-sm text-accent"
                    onClick={() => setOpenId(open ? null : post.id)}
                  >
                    {open ? "Show less" : "Show full post"}
                  </button>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-line px-2.5 py-1 font-mono text-xs ${toneText(post.label)}`}>
                    {post.label} {post.net > 0 ? `+${post.net}` : post.net}
                  </span>
                  {names.map((name) => (
                    <span key={name} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                      {name}
                    </span>
                  ))}
                  {post.live ? (
                    <span className="rounded-full border border-line px-2.5 py-1 text-xs text-accent">Live read</span>
                  ) : null}
                </div>
                {post.hits.length > 0 ? (
                  <p className="mt-2 font-mono text-xs text-muted">
                    {post.hits.map((hit) => `${hit.pole === "positive" ? "+" : "−"}${hit.term}`).join("  ")}
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-xs text-muted">No lexicon hits · treated as even</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="tabular-nums text-muted">
                    {post.likes} likes · {post.reposts} reposts · {post.replies} replies
                  </span>
                  <a
                    href={`https://x.com/${post.handle}/status/${post.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-accent"
                  >
                    Original
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    className="min-h-11 text-muted"
                    onClick={() => setHidden((current) => [...current, post.id])}
                  >
                    Hide here
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {hidden.length > 0 ? (
          <button
            type="button"
            className="mt-3 min-h-11 text-sm text-muted"
            onClick={() => setHidden([])}
          >
            Restore {hidden.length} hidden {hidden.length === 1 ? "post" : "posts"}
          </button>
        ) : null}
      </section>
    </main>
  );
}
