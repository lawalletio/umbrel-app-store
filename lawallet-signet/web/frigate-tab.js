// Adds a "Frigate" tab to Umbrel's Bitcoin Node dashboard. nginx injects this file (see default.conf).
// It only adds DOM next to the dashboard's own and reuses its CSS classes; nothing upstream is patched,
// so updating the umbrel-bitcoin image can't conflict. If the dashboard's markup changes, the tab just
// doesn't appear (it needs [data-slot=tabs-list] and <main>).
(() => {
  const PORT = 60001;
  const HOST = location.hostname;
  const HASH = "#frigate";
  const ORANGE = "rgb(255, 126, 5)";
  const GREEN = "#0BC39E";
  const BORDER = `<span aria-hidden="true" style="position:absolute;inset:0;padding:1px;border-radius:inherit;background:linear-gradient(rgb(49,49,49) 0%,rgba(49,49,49,0) 100%);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);pointer-events:none"></span>`;
  const CARD = "text-card-foreground flex flex-col gap-6 border shadow-sm bg-card-gradient backdrop-blur-2xl border-none rounded-3xl";
  const ICON = `<svg viewBox="0 0 18 18" class="h-[18px] w-[18px]" fill="none"><circle cx="9" cy="9" r="2.4" fill="${ORANGE}"/><path d="M5.2 12.8a5.4 5.4 0 0 1 0-7.6M12.8 5.2a5.4 5.4 0 0 1 0 7.6M2.6 15.4a9 9 0 0 1 0-12.8M15.4 2.6a9 9 0 0 1 0 12.8" stroke="${ORANGE}" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  const css = `
  body[data-fp] main:not(#fp-view){display:none}
  body[data-fp] [data-slot=tabs-trigger]:not(#fp-tab){color:rgb(255 255 255/.6)!important}
  body[data-fp] [data-slot=tabs-trigger]:not(#fp-tab)>span.absolute{opacity:0!important}
  body[data-fp] [data-slot=tabs-trigger]:not(#fp-tab)>div.overflow-hidden{width:0!important;opacity:0!important}
  #fp-view{display:none} body[data-fp] #fp-view{display:block}
  #fp-tab>span.absolute,#fp-tab>div{transition:opacity .25s,width .25s}
  #fp-tab:not([data-state=active])>span.absolute{opacity:0}
  #fp-tab:not([data-state=active])>div{width:0!important;opacity:0}
  #fp-view .fp-row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid rgb(255 255 255/.06);font-size:13px}
  #fp-view .fp-row:first-child{border-top:0}
  #fp-view .fp-addr{flex:1;min-width:0;padding:10px 14px;border-radius:9999px;background:rgb(255 255 255/.05);font:13px ui-monospace,Menlo,monospace;color:rgb(255 255 255/.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #fp-view .fp-log{font:11px/1.6 ui-monospace,Menlo,monospace;color:rgb(255 255 255/.4);word-break:break-all}
  #fp-view .fp-log .err{color:#f87171}
  #fp-view .fp-bars{display:flex;align-items:flex-end;gap:3px;height:140px}
  #fp-view .fp-bars>div{flex:1;min-width:2px;border-radius:2px 2px 0 0;background:${ORANGE};opacity:.85}
  #fp-view .fp-bars>div:hover{opacity:1}
  @keyframes fp-pulse{0%{transform:scale(.6);opacity:.55}100%{transform:scale(1.5);opacity:0}}
  #fp-view .fp-pulse{transform-origin:center;transform-box:fill-box;animation:fp-pulse 3.2s ease-out infinite}
  #fp-view .fp-pulse:nth-of-type(2){animation-delay:1.6s}`;

  const stat = (k, label, hint) => `<div class="flex flex-col items-center justify-center gap-2 py-6" title="${hint}">
    <h3 class="flex items-center gap-1 font-outfit text-[15px] font-[300] text-white/30">${label}</h3>
    <p class="font-outfit text-[20px] font-[500] leading-none"><span class="bg-text-gradient bg-clip-text text-transparent" data-k="${k}">–</span><span class="ml-1 text-[13px] font-[300] text-white/50" data-k="${k}-u"></span></p></div>`;
  const grid = (cells) => `<div data-slot="card" class="${CARD} p-0 overflow-hidden h-[240px] md:h-[120px]">${BORDER}
    <div class="h-full grid grid-cols-2 md:grid-cols-4 [&>*:nth-child(4n+1)]:bg-transparent [&>*:nth-child(4n+2)]:bg-white/5 [&>*:nth-child(4n+3)]:bg-white/5 [&>*:nth-child(4n+4)]:bg-transparent md:[&>*:nth-child(odd)]:bg-transparent md:[&>*:nth-child(even)]:bg-white/5">${cells}</div></div>`;
  const titled = (title, right, body) => `<div data-slot="card" class="${CARD} py-4">${BORDER}
    <div data-slot="card-header" class="flex justify-between items-center px-4 md:px-6"><div data-slot="card-title" class="font-outfit text-white text-[20px] font-[400] pt-2">${title}</div>${right}</div>
    <div data-slot="card-content" class="px-4 md:px-6">${body}</div></div>`;
  const legend = (k, label, color) => `<li class="flex w-full max-w-[10rem] justify-between items-center gap-4 select-none"><span class="flex items-center gap-1"><span class="h-3 w-3 rounded-sm border border-white/20" style="background:${color}"></span><span class="text-white/60">${label}</span></span><span class="text-white/40" data-k="${k}">–</span></li>`;
  const row = (label, k) => `<div class="fp-row"><span class="text-white/50">${label}</span><span class="text-white/80" data-k="${k}">–</span></div>`;

  const VIEW = `<div class="w-full max-w-screen-md mx-auto"><div class="flex flex-col gap-10 pb-26">
    <div data-slot="card" class="${CARD} py-6 pt-4 pb-0 md:pb-4">${BORDER}
      <div data-slot="card-content" class="sm:px-6 flex flex-col md:flex-row px-4 items-center">
        <div class="relative w-full flex-none md:flex-1 h-64 md:h-[375px] rounded-2xl bg-neutral-900/20 border-white/10 border-[0.5px] overflow-hidden">${BORDER}
          <svg viewBox="0 0 400 400" style="position:absolute;right:-30%;bottom:-80%;width:125%;max-width:none;pointer-events:none" aria-hidden="true">
            <defs><radialGradient id="fp-g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#1c1c1c"/><stop offset="1" stop-color="#000"/></radialGradient>
            <pattern id="fp-d" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="rgb(255 255 255/.12)"/></pattern></defs>
            <circle cx="200" cy="200" r="150" fill="url(#fp-g)" stroke="rgb(255 255 255/.08)"/>
            <circle cx="200" cy="200" r="150" fill="url(#fp-d)" opacity=".7"/>
            <circle class="fp-pulse" cx="200" cy="200" r="150" fill="none" stroke="${ORANGE}" stroke-width="1.2"/>
            <circle class="fp-pulse" cx="200" cy="200" r="150" fill="none" stroke="${ORANGE}" stroke-width="1.2"/>
            <path d="M40 120 Q200 -40 360 120" fill="none" stroke="${ORANGE}" stroke-opacity=".35"/>
          </svg>
          <h3 class="absolute top-[7%] left-[5%] flex items-center gap-1 justify-center pointer-events-none select-none">
            <span class="relative inline-flex items-center" role="status"><span class="absolute inset-0 rounded-full blur-[2px]" data-k="dot1"></span><span class="relative inline-block h-2 w-2 rounded-full shadow" data-k="dot2"></span></span>
            <span class="text-[14px] font-[500] ml-1" data-k="state">Checking</span><span class="text-white/60 text-[14px] font-[400]" data-k="state2"></span></h3>
          <h2 class="absolute top-[70%] md:top-[80%] left-[5%] text-[30px] pointer-events-none select-none">
            <div class="text-[14px] text-white/50 flex items-center gap-1"><span>Silent payments index</span></div>
            <span class="bg-text-gradient bg-clip-text text-transparent font-[500]" data-k="big">–</span><span class="text-white/60" data-k="pct"></span></h2>
        </div>
        <div class="w-full md:w-[215px] flex flex-col items-center mt-4 md:mt-0 pb-7 md:pb-0">
          <div data-slot="card" class="text-card-foreground gap-6 rounded-xl border shadow-sm flex flex-col bg-transparent border-none p-0">
            <div data-slot="card-header" class="grid auto-rows-min items-start gap-1.5 md:items-center md:justify-center p-0 -mb-4 md:mb-0"><div data-slot="card-title" class="font-outfit text-[16px] font-[500] bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.64)_100%)] bg-clip-text text-transparent">Block height</div></div>
            <div data-slot="card-content" class="sm:px-6 flex flex-1 flex-row-reverse md:flex-col items-center gap-8 p-0">
              <div class="w-[150px] h-[150px] md:mt-[-10px] mt-[-30px]"><svg viewBox="0 0 150 150" width="150" height="150">
                <circle cx="75" cy="75" r="58" fill="none" stroke="hsl(29 100% 15%)" stroke-width="16"/>
                <circle cx="75" cy="75" r="58" fill="none" stroke="${ORANGE}" stroke-width="16" stroke-dasharray="364.4" stroke-dashoffset="364.4" transform="rotate(-90 75 75)" data-k="ring" style="transition:stroke-dashoffset .6s"/>
                <text x="75" y="74" text-anchor="middle" fill="#fff" font-size="20" font-weight="500" data-k="ringv">–</text>
                <text x="75" y="93" text-anchor="middle" fill="rgb(255 255 255/.7)" font-size="11">Indexed</text></svg></div>
              <ul class="flex flex-col items-center gap-2 text-[12px]">${legend("hNode", "Node", "hsl(29 100% 51%)")}${legend("hFul", "Fulcrum", "hsl(29 100% 30%)")}${legend("hFri", "Frigate", "hsl(29 100% 15%)")}</ul>
            </div></div></div>
      </div></div>
    ${grid(stat("tip", "Index Tip", "Last block Frigate indexed for silent payments") + stat("mem", "Mempool", "Unconfirmed transactions Frigate is tracking") + stat("cli", "Fulcrum Clients", "Open Electrum connections to the Fulcrum backend (Frigate proxies wallets through it)") + stat("seen", "Last Heartbeat", "Time since Frigate's last health report"))}
    ${titled("Connect", `<span class="text-white/50 text-[12px]">signet</span>`, `
      <div class="flex items-center gap-2 mb-4"><span class="fp-addr" data-k="addr"></span>
        <button type="button" data-k="copy" class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all cursor-pointer rounded-full bg-button-gradient backdrop-blur-xl h-9 px-4 py-2 relative">${BORDER}<span class="text-[13px] text-white/80 font-[500]">Copy</span></button></div>
      ${row("Protocol", "proto")}${row("Silent payments", "sp")}${row("SSL", "ssl")}${row("Backend", "backend")}
      <p class="text-white/40 text-[12px] mt-3 pb-2">Sparrow: Settings → Server → Private Electrum → URL <b class="text-white/60">${HOST}</b>, port <b class="text-white/60">${PORT}</b>, SSL off.</p>`)}
    ${titled("Indexed Transactions", `<span class="text-white/50 text-[12px]" data-k="barsInfo"></span>`, `<div class="fp-bars pb-2" data-k="bars"></div>`)}
    ${grid(stat("txn", "Transactions", "Transactions in Fulcrum's index") + stat("utxo", "UTXO Set", "Unspent outputs tracked by Fulcrum") + stat("subs", "Subscriptions", "Active Electrum subscriptions on Fulcrum") + stat("fmem", "Fulcrum Memory", "Fulcrum's resident memory"))}
    ${titled("Frigate Log", `<span class="text-white/50 text-[12px]" data-k="errs"></span>`, `<div class="fp-log pb-2" data-k="log"></div>`)}
  </div></div>`;

  const $ = (k) => document.querySelector(`#fp-view [data-k="${k}"]`);
  const set = (k, v) => { const el = $(k); if (el && el.textContent !== String(v)) el.textContent = v; };
  const num = (n) => (n == null || isNaN(n) ? "–" : Number(n).toLocaleString("en-US"));
  const short = (n) => (n >= 1e6 ? [(n / 1e6).toFixed(1), "M"] : n >= 1e3 ? [(n / 1e3).toFixed(1), "k"] : [num(n), ""]);
  const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? [s, "sec"] : s < 5400 ? [Math.round(s / 60), "min"] : [Math.round(s / 3600), "hours"]; };
  // ponytail: Frigate logs in the container's timezone; Docker defaults to UTC.
  const ts = (line) => Date.parse(line.slice(0, 23).replace(" ", "T").replace(",", ".") + "Z");
  const getJSON = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  function parseLog(text) {
    const lines = text.split("\n").filter((l) => /^\d{4}-\d\d-\d\d /.test(l)); // drops stack-trace lines
    const out = { lines, blocks: [], errors: lines.filter((l) => / ERROR /.test(l)) };
    for (const l of lines) {
      let m;
      if ((m = l.match(/Server health: backend (\w+); index at tip ([\d,]+), mempool (\d+) txs/)))
        Object.assign(out, { phase: "ready", at: ts(l), backend: m[1], tip: +m[2].replace(/,/g, ""), mempool: +m[3] });
      else if (/Electrum server listening/.test(l)) Object.assign(out, { phase: "ready", at: ts(l) });
      else if ((m = l.match(/Indexing progress: \d+ \/ \d+ blocks \(([\d.]+)%, height (\d+)\)/)))
        Object.assign(out, { phase: "indexing", at: ts(l), progress: +m[1], tip: +m[2] });
      else if (/Waiting for sync/.test(l)) Object.assign(out, { phase: "waiting", at: ts(l) });
      else if ((m = l.match(/Indexed (\d+) transactions to block height (\d+)/))) {
        out.blocks.push([+m[2], +m[1]]);
        out.tip = Math.max(out.tip || 0, +m[2]);
        out.at = ts(l);
      }
    }
    return out;
  }

  async function refresh() {
    const [sync, ful, logText] = await Promise.all([
      getJSON("/api/rpc/sync"),
      getJSON("/__frigate/fulcrum"),
      fetch("/__frigate/log", { headers: { Range: "bytes=-65536" }, cache: "no-store" }).then((r) => (r.ok ? r.text() : "")).catch(() => null),
    ]);
    const f = parseLog(logText || "");
    const nodeTip = sync?.blockHeight;
    const fulTip = ful?.Controller?.["Header count"] ? ful.Controller["Header count"] - 1 : null;
    const pct = f.phase === "indexing" ? f.progress : nodeTip && f.tip ? Math.min(100, (f.tip / nodeTip) * 100) : 0;
    const synced = f.phase === "ready" && pct >= 99.99;

    const [label, color, detail, big] =
      logText === null ? ["Unreachable", "#888", "retrying", "Unknown"]
      : f.phase === "ready" ? ["Running", GREEN, f.backend && f.backend !== "connected" ? `backend ${f.backend}` : "serving wallets", synced ? "Synchronized" : "Catching up"]
      : f.phase === "indexing" ? ["Indexing", ORANGE, "building the silent payments index", "Indexing"]
      : f.phase === "waiting" ? ["Waiting", ORANGE, "for Bitcoin Core to sync", "Waiting for node"]
      : ["Starting", "#888", "", "Starting"];
    $("dot1").style.background = $("dot2").style.background = color;
    $("state").style.color = color;
    set("state", label); set("state2", detail ? ` ${detail}` : "");
    set("big", big + " ");
    set("pct", f.phase === "waiting" && sync ? `${(sync.syncProgress * 100).toFixed(1)}%` : `${pct.toFixed(pct >= 99.99 || pct === 0 ? 0 : 1)}%`);
    $("ring").setAttribute("stroke-dashoffset", String(364.4 * (1 - pct / 100)));
    set("ringv", `${Math.floor(pct)}%`);
    set("hNode", num(nodeTip)); set("hFul", num(fulTip)); set("hFri", num(f.tip));

    set("tip", num(f.tip));
    set("mem", num(f.mempool)); set("mem-u", f.mempool != null ? "txs" : "");
    const cli = ful?.["Server Manager"]?.["number of clients"];
    set("cli", num(cli)); set("cli-u", cli != null ? "open" : "");
    const [a, au] = f.at ? ago(Date.now() - f.at) : ["–", ""];
    set("seen", a); set("seen-u", au && `${au} ago`);

    set("addr", `${HOST}:${PORT}`);
    set("proto", "Electrum 1.4 – 1.6");
    set("sp", "BIP352 (blockchain.silentpayments.subscribe)");
    set("ssl", "Off (TCP)");
    set("backend", `Fulcrum${ful?.["Bitcoin Daemon"]?.["bitcoind info"]?.subversion ? ` → Bitcoin Core ${ful["Bitcoin Daemon"]["bitcoind info"].subversion.replace(/^\/Satoshi:|\/$/g, "")}` : ""}`);

    const c = ful?.Controller || {};
    const [t, tu] = short(c.TxNum); set("txn", t); set("txn-u", tu);
    const [u, uu] = short(c["UTXO set"]); set("utxo", u); set("utxo-u", uu);
    set("subs", num(ful?.SubsMgr?.["Num. active client subscriptions"]));
    const kb = ful?.["Memory Usage"]?.["physical kB"];
    set("fmem", kb ? Math.round(kb / 1024) : "–"); set("fmem-u", kb ? "MB" : "");

    const blocks = f.blocks.slice(-48);
    const max = Math.max(1, ...blocks.map((b) => b[1]));
    $("bars").innerHTML = blocks.map(([h, n]) => `<div style="height:${Math.max(2, (n / max) * 100)}%" title="Block ${num(h)}: ${n} transactions"></div>`).join("")
      || `<p class="text-white/40 text-[12px]">Shows each new block once the index is at the tip.</p>`;
    set("barsInfo", blocks.length ? `last ${blocks.length} blocks · max ${max}` : "");

    set("errs", f.errors.length ? `${f.errors.length} errors in recent log` : "");
    const log = $("log");
    log.replaceChildren(...f.lines.slice(-10).map((l) => {
      const d = document.createElement("div");
      d.textContent = l.replace(/^\S+ (\S+),\d+ /, "$1 ").replace(/ \[[^\]]+\] \S+ /, " ");
      if (/ ERROR /.test(l)) d.className = "err";
      return d;
    }));
  }

  let timer;
  function sync() {
    const on = location.hash === HASH;
    document.body.toggleAttribute("data-fp", on);
    const tab = document.getElementById("fp-tab");
    if (tab) { tab.dataset.state = on ? "active" : "inactive"; tab.setAttribute("aria-selected", String(on)); }
    if (on && !timer) { refresh(); timer = setInterval(refresh, 5000); }
    if (!on && timer) { clearInterval(timer); timer = null; }
  }

  function mount() {
    const list = document.querySelector("[data-slot=tabs-list]");
    const main = document.querySelector("main:not(#fp-view)");
    if (!list || !main) return;
    if (!document.getElementById("fp-tab")) {
      const tab = list.querySelector("[data-slot=tabs-trigger]").cloneNode(false);
      for (const a of ["id", "aria-controls", "aria-current", "data-discover", "data-radix-collection-item"]) tab.removeAttribute(a);
      tab.classList.remove("active");
      Object.assign(tab, { id: "fp-tab", href: HASH });
      tab.innerHTML = `<span class="absolute inset-0 -z-10 rounded-full bg-[#252525]">${BORDER}</span><div class="overflow-hidden flex-shrink-0" style="width:18px">${ICON}</div><span class="text-[12px] font-[400]">Frigate</span>`;
      tab.addEventListener("click", (e) => { e.preventDefault(); if (location.hash !== HASH) history.pushState(history.state, "", location.pathname + HASH); sync(); });
      list.appendChild(tab);
    }
    if (!document.getElementById("fp-view")) {
      const view = document.createElement("main");
      view.id = "fp-view";
      view.className = main.className;
      view.innerHTML = VIEW;
      main.after(view);
      view.querySelector('[data-k="copy"]').onclick = async (e) => {
        const b = e.currentTarget.lastElementChild;
        try { await navigator.clipboard.writeText(`${HOST}:${PORT}`); b.textContent = "Copied"; } catch { b.textContent = "Select it"; }
        setTimeout(() => (b.textContent = "Copy"), 1500);
      };
    }
    sync();
  }

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  // The dashboard's router navigates with pushState/replaceState, which fire no event; wrap them so the tab
  // closes when another tab is chosen.
  for (const fn of ["pushState", "replaceState"]) {
    const orig = history[fn];
    history[fn] = function (...args) { const r = orig.apply(this, args); queueMicrotask(sync); return r; };
  }
  addEventListener("popstate", sync);
  addEventListener("hashchange", sync);
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  mount();
})();
