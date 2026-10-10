const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { credentialsWarning, ACCOUNT_PREFIX_WARNING } = require("../credentials.js");
const { requestEpm } = require("../http.js");
const root = path.resolve(__dirname, "../..");
const read = name => readFileSync(path.join(root, name), "utf8");
const manifest = JSON.parse(read("manifest.json"));

test("Core name, source install path and unchanged security paragraph", () => {
  const readme = read("README.md");
  assert.match(readme, /^# FMEPM Connect Core\n/);
  assert.equal(manifest.display_name, "FMEPM Connect Core");
  assert.match(readme, /\[FMEPM Connect\]\(https:\/\/mcp.fmepm.com\)/);
  assert.match(readme, /cd oracle-epm-mcp-server\/server\nnpm ci/);
  assert.ok(readme.includes(read("server/test/security-paragraph.txt").trimEnd()));
  assert.match(manifest.user_config.epm_username.description, /without the cloud account name prefix/);
  assert.doesNotMatch(readme, /identitydomain\.username|IDENTITYDOMAIN\.your_username/);
});

test("prefix warning needs a matching account on a recognized pod and exposes no username", () => {
  for (const host of ["epm-acme.epm.us6.oraclecloud.com", "epm-test-acme.epm.us-ashburn-1.ocs.oraclecloud.com", "epm-my-acct.pbcs.us2.oraclecloud.com"]) {
    const user = host.includes("my-acct") ? "my-acct.person@example.com" : "acme.person@example.com";
    const warning = credentialsWarning(`https://${host}`, user);
    assert.equal(warning, ACCOUNT_PREFIX_WARNING);
    assert.doesNotMatch(warning, /person@example/);
  }
  for (const [url, user] of [["https://custom.example", "acme.person"], ["https://epm-acme.epm.us6.oraclecloud.com", "person@example.com"], ["https://epm-other.epm.us6.oraclecloud.com", "acme.person"], ["invalid", "acme.person"]]) assert.equal(credentialsWarning(url, user), null);
});

test("401 retains the supplied Basic username but discards a credential-echoing response", async () => {
  const config = { baseUrl: "https://epm-acme.epm.us6.oraclecloud.com", username: "acme.secret-user", password: "secret-password" };
  let calls = 0;
  const result = await requestEpm(config, "GET", "/api", null, async (url, opts) => {
    calls++;
    assert.equal(url, config.baseUrl + "/api");
    assert.equal(Buffer.from(opts.headers.Authorization.slice(6), "base64").toString(), config.username + ":" + config.password);
    return { status: 401, text() { throw new Error("must not read credential echo"); } };
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 401);
  assert.match(result.data.message, /26\.11.*November 20, 2026/);
  assert.doesNotMatch(JSON.stringify(result), /secret-user|secret-password/);
  assert.equal(config.username, "acme.secret-user");
});

test("unprefixed authentication errors get no guessed prefix warning; success data is unchanged", async () => {
  const config = { baseUrl: "https://epm-acme.epm.us6.oraclecloud.com", username: "person", password: "secret" };
  const denied = await requestEpm(config, "GET", "/api", null, async () => ({ status: 401 }));
  assert.doesNotMatch(denied.data.message, /26\.11/);
  const ok = await requestEpm(config, "POST", "/api", { name: "x" }, async (url, opts) => {
    assert.equal(opts.body, '{"name":"x"}');
    return { status: 200, text: async () => '{"items":[1]}' };
  });
  assert.deepEqual(ok, { status: 200, data: { items: [1] } });
});

test("mock MCP server starts and all advertised tools answer without Oracle credentials", async () => {
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, "server/index.js")], env: { ...process.env, EPM_MODE: "mock", EPM_USERNAME: "", EPM_PASSWORD: "" }, stderr: "pipe" });
  const client = new Client({ name: "local-test", version: "1" });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 7);
    const args = { run_business_rule: { ruleName: "Agg_AllData" }, check_job_status: { jobId: 48291 }, update_substitution_variable: { variableName: "CurrMonth", newValue: "Apr" } };
    for (const tool of listed.tools) {
      const result = await client.callTool({ name: tool.name, arguments: args[tool.name] || {} });
      assert.ok(!result.isError, JSON.stringify(result));
      assert.match(result.content[0].text, /\[MOCK\]/);
    }
  } finally { await client.close(); await transport.close(); }
});
