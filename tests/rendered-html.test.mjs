import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Coffey Casino experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Coffey Casino<\/title>/i);
  assert.match(html, /Coffey Casino/);
  assert.match(html, /Spin for the.*high score/);
  assert.match(html, /Top scores/);
  assert.match(html, /Cash out/);
  assert.match(html, /30 credits/);
  assert.doesNotMatch(html, /reel-label/);
  assert.doesNotMatch(html, /jackpot ladder|jackpot-row|WON|ranch/i);
  assert.doesNotMatch(html, /Rachel|Sam|love|ranch|Your site is taking shape|codex-preview|react-loading-skeleton/i);

  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /id: "candy", emoji: "🍬"/);
  assert.match(source, /INITIAL_CREDITS = 30/);
  assert.match(source, /const BETS = \[1, 3, 5, 10\]/);
  assert.match(source, /MAX_CREDITS = 500/);
  assert.match(source, /Math\.random/);
  assert.match(source, /from\("high_scores"\)/);
  assert.doesNotMatch(source, /ranch|Ranch dressing/i);
});
