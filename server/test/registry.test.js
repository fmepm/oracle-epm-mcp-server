const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { AjvJsonSchemaValidator } = require("@modelcontextprotocol/sdk/validation/ajv");
const read = name => JSON.parse(readFileSync(path.join(__dirname, "../../integrations/registry", name), "utf8"));
const entry = read("server.json");

test("Core entry validates against the same official schema as the hosted entry", () => {
  const schema = read("server.schema.json");
  const validate = new AjvJsonSchemaValidator().getValidator(schema);
  assert.equal(entry.$schema, schema.$id);
  assert.equal(validate(entry).valid, true, validate(entry).errorMessage);
  assert.equal(validate({ ...entry, description: "x".repeat(101) }).valid, false);
  assert.equal(validate({ ...entry, packages: [{ ...entry.packages[0], transport: { type: "bad" } }] }).valid, false);
});

test("Core pins the existing release hash without claiming to ship unbuilt changes", () => {
  assert.equal(entry.name, "com.fmepm/connect-core");
  assert.equal(entry.version, "2.0.0");
  assert.equal(entry.packages[0].registryType, "mcpb");
  assert.equal(entry.packages[0].transport.type, "stdio");
  assert.equal(entry.packages[0].identifier, "https://github.com/fmepm/oracle-epm-mcp-server/releases/download/v2.0.0/oracle-epm-cloud-2.0.0.mcpb");
  assert.equal(entry.packages[0].fileSha256, "ac1dc0eb5f5f04c32d14017e36383bce531ae6be7ac77710e73255d97fdad5ce");
  const guide = readFileSync(path.join(__dirname, "../../integrations/registry/README.md"), "utf8");
  assert.match(guide, /Do not publish this draft/);
  assert.match(guide, /new approved bundle/);
});

test("DNS proof reuses the hosted namespace's public key and contains no secret", () => {
  const record = read("dns-record.json");
  assert.equal(record.name, "fmepm.com");
  assert.equal(record.type, "TXT");
  assert.equal(record.value, "v=MCPv1; k=ed25519; p=svXBCGXucu703GYq2LiOKuCST60sKRAd/VmQODtWCRQ=");
  assert.doesNotMatch(JSON.stringify(entry), /password|secret|token/i);
});
