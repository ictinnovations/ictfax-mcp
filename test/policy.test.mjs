/**
 * Config and write-gate tests. Run after build (they import from dist/).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../dist/config.js";
import { registerTools } from "../dist/tools.js";

const base = {
  ICTFAX_BASE_URL: "https://fax.example.com/api/",
  ICTFAX_USERNAME: "admin@example.com",
  ICTFAX_PASSWORD: "x",
};

test("loadConfig requires base url, username and password", () => {
  assert.throws(() => loadConfig({}), /ICTFAX_BASE_URL/);
  assert.throws(() => loadConfig({ ICTFAX_BASE_URL: "https://x" }), /ICTFAX_USERNAME/);
});

test("base url trailing slash is trimmed; account id defaults to 1", () => {
  const c = loadConfig(base);
  assert.equal(c.baseUrl, "https://fax.example.com/api");
  assert.equal(c.accountId, 1);
  assert.equal(loadConfig({ ...base, ICTFAX_ACCOUNT_ID: "7" }).accountId, 7);
});

test("write is off by default and parses truthy strings", () => {
  assert.equal(loadConfig(base).allowWrite, false);
  assert.equal(loadConfig({ ...base, ICTFAX_MCP_ALLOW_WRITE: "1" }).allowWrite, true);
});

function collectTools(allowWrite) {
  const names = [];
  const fakeServer = { registerTool: (name) => names.push(name) };
  registerTools(fakeServer, { ...loadConfig(base), allowWrite }, /* client */ {});
  return names;
}

test("read-only install registers only the two read tools", () => {
  assert.deepEqual(new Set(collectTools(false)), new Set([
    "ictfax_list_faxes", "ictfax_get_fax_status",
  ]));
});

test("write install additionally registers upload and send", () => {
  const names = collectTools(true);
  assert.ok(names.includes("ictfax_upload_document"));
  assert.ok(names.includes("ictfax_send_fax"));
  assert.equal(names.length, 4);
});
