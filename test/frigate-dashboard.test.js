// node test/frigate-dashboard.test.js: parses real Frigate log lines the dashboard depends on.
const assert = require("node:assert");
const { parseLog } = require("../images/frigate-web/app.js");

const T = "INFO [main] c.s.f.Frigate";
const at = (time, msg, who = T) => `2026-11-24 ${time},000 ${who} ${msg}`;

let f = parseLog([
  "ch-cut first line",
  at("00:03:34", "Starting Frigate v1.6.1 on mainnet"),
  at("00:03:37", "Waiting for sync to complete..."),
].join("\n"));
assert.deepEqual([f.phase, f.version, f.network, f.lines.length], ["waiting", "1.6.1", "mainnet", 2]);

f = parseLog([
  at("01:31:16", "Indexing progress: 2320 / 332106 blocks (0.7%, height 2319)"),
  at("01:31:46", "Indexing progress: 6136 / 332106 blocks (1.8%, height 6135)"),
].join("\n"));
assert.deepEqual([f.phase, f.progress, f.tip, f.chainTip], ["indexing", 1.8, 6135, 332105]);
assert.equal(f.rate, (6136 - 2320) / 30);

f = parseLog([
  at("07:18:59", "Electrum server listening on tcp://0.0.0.0:50005"),
  at("14:45:00", "Indexed 203 transactions to block height 332454"),
  at("14:59:37", "Server health: backend connected; index at tip 332,455, mempool 1,204 txs"),
  at("15:18:59", "Aggregate server stats: now [sessions:20, IPs:10, silent payments subscriptions:10] last 1h [notifications:30]"),
  at("15:20:00", "boom", "ERROR [x] c.s.f.X"),
].join("\n"));
assert.deepEqual([f.phase, f.backend, f.tip, f.chainTip, f.mempool, f.errors], ["ready", "connected", 332455, 332455, 1204, 1]);
assert.deepEqual(f.blocks, [[332454, 203]]);
assert.deepEqual(f.usage, { sessions: 20, IPs: 10, "silent payments subscriptions": 10, notifications: 30 });

f = parseLog(at("15:00:00", "Server health: backend partly disconnected, reconnects; index 1,000 of tip 1,010, mempool 1 tx"));
assert.deepEqual([f.backend, f.tip, f.chainTip, f.mempool], ["partly disconnected", 1000, 1010, 1]);

f = parseLog([at("15:00:00", "Server health: backend connected; index at tip 5, mempool 0 txs"), at("15:01:00", "Starting Frigate v1.6.1 on signet")].join("\n"));
assert.deepEqual([f.phase, f.backend], ["starting", null]);
console.log("frigate dashboard parser ok");
