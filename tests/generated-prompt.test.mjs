import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generated developer prompt enforces the shared repo and acceptance tests", async () => {
  const source = await readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8");
  assert.match(source, /existing Conflux Regional Hubs repository/);
  assert.match(source, /Do not create a second repository/);
  assert.match(source, /REFERENCE FIDELITY/);
  assert.match(source, /curated feed cards work without credentials/i);
  assert.match(source, /npm test/);
});

test("public questionnaire is separate from the protected manager", async () => {
  const questionnaire = await readFile(new URL("../app/questionnaire/page.tsx", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio/page.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../app/components/regional-shell.tsx", import.meta.url), "utf8");
  assert.match(questionnaire, /setupOnly/);
  assert.doesNotMatch(questionnaire, /requireChatGPTUser/);
  assert.match(studio, /requireChatGPTUser/);
  assert.match(shell, /\/questionnaire\?region=/);
});
