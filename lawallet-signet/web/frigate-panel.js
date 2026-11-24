// Frigate access panel, injected into the Bitcoin Node dashboard by nginx.
(() => {
  const PORT = 60001;
  const host = location.hostname;
  const addr = `${host}:${PORT}`;
  const KEY = "frigate-panel-collapsed";
  let collapsed = false;
  try { collapsed = localStorage.getItem(KEY) === "1"; } catch {}

  const css = `
  #fp{position:fixed;right:16px;bottom:80px;z-index:2147483647;width:320px;max-width:calc(100vw - 32px);
    font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#eee;background:rgba(22,22,24,.94);
    border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.45);backdrop-filter:blur(8px)}
  #fp button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
  #fp .hd{display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;text-align:left}
  #fp .dot{width:8px;height:8px;border-radius:50%;background:#888;flex:none}
  #fp .t{font-weight:600;flex:1}
  #fp .bd{padding:0 14px 12px}
  #fp.c .bd{display:none}
  #fp .row{display:flex;align-items:center;gap:8px;margin:6px 0}
  #fp code{flex:1;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.07);font:12px ui-monospace,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #fp .cp{padding:6px 10px;border-radius:8px;background:#f7931a;color:#111;font-weight:600}
  #fp .k{color:#9a9a9a}
  #fp .st{margin-top:8px}
  #fp .ln{margin-top:4px;color:#9a9a9a;font:11px ui-monospace,Menlo,monospace;word-break:break-all}`;

  const el = document.createElement("div");
  el.id = "fp";
  el.innerHTML = `<style>${css}</style>
    <button class="hd" type="button" aria-expanded="true"><span class="dot"></span>
      <span class="t">Electrum + Silent Payments</span><span class="k">Frigate</span></button>
    <div class="bd">
      <div class="row"><code>${addr}</code><button class="cp" type="button">Copy</button></div>
      <div class="k">TCP, SSL off &middot; signet &middot; BIP352 via Frigate, backend Fulcrum</div>
      <div class="k">Sparrow: Settings &rarr; Server &rarr; Private Electrum, URL <b>${host}</b>, port <b>${PORT}</b>, SSL off</div>
      <div class="st"><span class="k">Status:</span> <b class="sv">checking&hellip;</b></div>
      <div class="ln"></div>
    </div>`;
  const hd = el.querySelector(".hd");
  const apply = () => { el.classList.toggle("c", collapsed); hd.setAttribute("aria-expanded", String(!collapsed)); };
  hd.onclick = () => { collapsed = !collapsed; apply(); try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch {} };
  el.querySelector(".cp").onclick = async (e) => {
    try { await navigator.clipboard.writeText(addr); e.target.textContent = "Copied"; }
    catch { e.target.textContent = "Select it"; }
    setTimeout(() => (e.target.textContent = "Copy"), 1500);
  };
  apply();
  document.body.appendChild(el);

  // Status = the most recent milestone in Frigate's log since its last start.
  const STATES = [
    [/Electrum server listening/, "Ready", "#3fb950"],
    [/Waiting for sync/, "Waiting for the node to finish syncing", "#d29922"],
    [/ERROR/, "Error (see line below)", "#f85149"],
  ];
  async function refresh() {
    let lines = [];
    try {
      const r = await fetch("/__frigate/log", { headers: { Range: "bytes=-16384" }, cache: "no-store" });
      if (r.ok) lines = (await r.text()).split("\n").filter(Boolean);
    } catch {}
    const start = lines.map((l) => /Starting Frigate/.test(l)).lastIndexOf(true);
    const recent = start >= 0 ? lines.slice(start) : lines;
    let state = lines.length ? ["Starting / indexing", "#58a6ff"] : ["Not running yet", "#888"];
    for (let i = recent.length - 1; i >= 0; i--) {
      const hit = STATES.find(([re]) => re.test(recent[i]));
      if (hit) { state = hit.slice(1); break; }
    }
    el.querySelector(".sv").textContent = state[0];
    el.querySelector(".dot").style.background = state[1];
    el.querySelector(".ln").textContent = (recent[recent.length - 1] || "").replace(/^\S+ \S+ /, "").slice(0, 180);
  }
  refresh();
  setInterval(refresh, 10000);
})();
