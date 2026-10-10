const { credentialsWarning } = require("./credentials.js");

async function requestEpm(config, method, path, body, fetchImpl = require("node-fetch")) {
  const authorization = Buffer.from(config.username + ":" + config.password).toString("base64");
  const opts = { method, headers: { Authorization: "Basic " + authorization, "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetchImpl(config.baseUrl + path, opts);
  // Authentication errors can echo credentials. Do not expose their response body.
  if (res.status === 401) {
    const warning = credentialsWarning(config.baseUrl, config.username);
    return { status: 401, data: { message: "Oracle rejected the username or password (401)." + (warning ? " " + warning : "") } };
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { rawResponse: text }; }
  return { status: res.status, data };
}
module.exports = { requestEpm };
