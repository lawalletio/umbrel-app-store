// Frigate dashboard. Everything shown comes from Frigate's own log (served read-only at /api/log),
// so the page needs nothing from the Bitcoin Node or Electrum backend apps.
const PORT = 50005; // Frigate's Electrum port on the host (lawallet-frigate/docker-compose.yml)

// ponytail: Frigate logs in the container's timezone; Docker defaults to UTC.
const ts = (line) => Date.parse(line.slice(0, 23).replace(" ", "T").replace(",", ".") + "Z");
const int = (s) => (s == null ? null : +s.replace(/,/g, ""));

function parseLog(text) {
  const lines = text.split("\n").filter((l) => /^\d{4}-\d\d-\d\d /.test(l)); // drops stack traces and a cut first line
  const out = { lines, blocks: [], samples: [], usage: null, errors: lines.filter((l) => / ERROR /.test(l)).length };
  for (const l of lines) {
    let m;
    if ((m = l.match(/Starting Frigate v(\S+) on (\w+)/))) // a (re)start: earlier run state no longer holds
      Object.assign(out, { phase: "starting", at: ts(l), version: m[1], network: m[2], backend: null, usage: null, samples: [] });
    else if ((m = l.match(/Server health: (?:backend ([a-z ]+?)(?:,[^;]*)?(?:;|$))?\s*(?:index (?:at tip ([\d,]+)|([\d,]+) of tip ([\d,]+)), mempool ([\d,]+) txs?)?/))) {
      const tip = int(m[2] ?? m[3]);
      Object.assign(out, { phase: "ready", at: ts(l), backend: m[1] ?? out.backend });
      if (tip != null) Object.assign(out, { tip, chainTip: int(m[2] ?? m[4]), mempool: int(m[5]) });
    } else if (/Electrum server listening/.test(l)) Object.assign(out, { phase: "ready", at: ts(l), listening: ts(l) });
    else if ((m = l.match(/Indexing progress: (\d+) \/ (\d+) blocks \(([\d.]+)%, height (\d+)\)/))) {
      const [done, total, tip] = [+m[1], +m[2], +m[4]];
      if (out.phase !== "indexing" || done < (out.samples.at(-1)?.done ?? 0)) out.samples = []; // new run
      out.samples.push({ at: ts(l), done });
      Object.assign(out, { phase: "indexing", at: ts(l), progress: +m[3], tip, chainTip: tip + total - done });
    } else if (/Waiting for sync/.test(l)) Object.assign(out, { phase: "waiting", at: ts(l) });
    else if ((m = l.match(/Indexed (\d+) transactions to block height (\d+)/))) {
      out.blocks.push([+m[2], +m[1]]);
      out.tip = Math.max(out.tip || 0, +m[2]);
      out.chainTip = Math.max(out.chainTip || 0, out.tip);
      out.at = ts(l);
    } else if ((m = l.match(/Aggregate server stats:(?: now \[([^\]]*)\])?(?: last 1h \[([^\]]*)\])?/))) {
      out.usage = Object.fromEntries(`${m[1] || ""}, ${m[2] || ""}`.split(", ").filter(Boolean).map((kv) => kv.split(":")).map(([k, v]) => [k, +v]));
    }
  }
  const s = out.samples.slice(-12); // blocks/sec over the last few progress lines
  out.rate = s.length > 1 && s.at(-1).at > s[0].at ? ((s.at(-1).done - s[0].done) * 1000) / (s.at(-1).at - s[0].at) : null;
  return out;
}

if (typeof document === "undefined") module.exports = { parseLog }; // node test/frigate-dashboard.test.js
else {
  const HOST = location.hostname;
  const ACCENT = "#3b8ee6", GREEN = "#0bc39e", RED = "#f87171", GREY = "#888";
  const $ = (k) => document.querySelector(`[data-k="${k}"]`);
  const set = (k, v) => { const el = $(k); if (el && el.textContent !== String(v)) el.textContent = v; };
  const num = (n) => (n == null || isNaN(n) ? "–" : Number(n).toLocaleString("en-US"));
  const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? [s, "sec ago"] : s < 5400 ? [Math.round(s / 60), "min ago"] : [Math.round(s / 3600), "hours ago"]; };
  const dur = (s) => (s < 5400 ? `${Math.max(1, Math.round(s / 60))} min` : s < 172800 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 86400)} days`);

  set("addr", `${HOST}:${PORT}`); set("host", HOST); set("port", PORT);
  $("copy").onclick = async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(`${HOST}:${PORT}`); b.textContent = "Copied"; } catch { b.textContent = "Select it"; }
    setTimeout(() => (b.textContent = "Copy"), 1500);
  };

  async function refresh() {
    const text = await fetch("api/log", { headers: { Range: "bytes=-262144" }, cache: "no-store" })
      .then((r) => (r.ok ? r.text() : r.status === 404 ? "" : null)).catch(() => null);
    const f = parseLog(text || "");
    const age = f.at ? Date.now() - f.at : Infinity;
    const stale = f.phase === "ready" && age > 12 * 60e3; // health lines come every 5 min
    const left = f.chainTip != null && f.tip != null ? Math.max(0, f.chainTip - f.tip) : null;
    const pct = f.phase === "indexing" ? f.progress : f.tip && f.chainTip ? Math.min(100, (f.tip / f.chainTip) * 100) : 0;
    const eta = f.phase === "indexing" && f.rate > 0 && left != null ? dur(left / f.rate) : null;

    const [label, color, detail, big] =
      text === null ? ["Unreachable", GREY, "retrying", "Unknown"]
      : stale ? ["Not responding", RED, `no report for ${ago(age).join(" ").replace(" ago", "")}`, "Check the logs"]
      : f.phase === "ready" ? ["Running", GREEN, f.backend && f.backend !== "connected" ? `backend ${f.backend}` : "serving wallets", left ? "Catching up" : "Synchronized"]
      : f.phase === "indexing" ? ["Indexing", ACCENT, eta ? `about ${eta} left` : "building the index", "Indexing"]
      : f.phase === "waiting" ? ["Waiting", ACCENT, "for Bitcoin Core to sync", "Waiting for node"]
      : ["Starting", GREY, "", "Starting"];
    $("dot").style.background = $("dot").style.color = $("state").style.color = color;
    set("state", label); set("state2", detail);
    set("net", f.network || "–"); set("ver", f.version ? ` · v${f.version}` : "");
    set("bigv", big);
    set("pct", f.phase === "indexing" || f.phase === "ready" ? `${pct.toFixed(pct >= 99.95 || pct === 0 ? 0 : 1)}%` : "");
    $("ring").setAttribute("stroke-dashoffset", String(364.4 * (1 - pct / 100)));
    set("ringv", `${Math.floor(pct)}%`);
    set("lIdx", num(f.tip)); set("lTip", num(f.chainTip)); set("lLeft", num(left));

    set("tip", num(f.tip));
    set("mem", num(f.mempool)); set("mem-u", f.mempool != null ? "txs" : "");
    set("be", f.backend ? f.backend[0].toUpperCase() + f.backend.slice(1) : f.phase === "indexing" ? "After index" : "–");
    const [a, au] = f.at ? ago(age) : ["–", ""];
    set("seen", a); set("seen-u", au);

    const u = f.usage; // Frigate rounds to tens and leaves out figures under 10
    const reported = u || (f.phase === "ready" && Date.now() - f.listening > 65 * 60e3); // no line in an hour = all under 10
    const fig = (k) => (!reported ? "–" : u?.[k] ? num(u[k]) : "<10");
    set("ses", fig("sessions")); set("ips", fig("IPs")); set("sps", fig("silent payments subscriptions"));
    set("ntf", fig("notifications")); set("ntf-u", reported ? "last hour" : "");

    const blocks = f.blocks.slice(-48);
    const max = Math.max(1, ...blocks.map((b) => b[1]));
    $("bars").innerHTML = blocks.map(([h, n]) => `<div style="height:${Math.max(2, (n / max) * 100)}%" title="Block ${num(h)}: ${num(n)} transactions"></div>`).join("")
      || `<p class="empty">Each new block shows here once the index reaches the chain tip.</p>`;
    set("barsInfo", blocks.length ? `last ${blocks.length} blocks · max ${num(max)}` : "");

    set("errs", f.errors ? `${f.errors} errors in recent log` : "");
    $("log").replaceChildren(...(f.lines.length ? f.lines.slice(-12) : ["Frigate hasn't written its log yet."]).map((l) => {
      const d = document.createElement("div");
      d.textContent = l.replace(/^\S+ (\S+),\d+ /, "$1 ").replace(/ \[[^\]]+\] \S+ /, " ");
      if (/ ERROR /.test(l)) d.className = "err";
      return d;
    }));
  }

  refresh();
  setInterval(() => document.hidden || refresh(), 5000);
}
