const ACCOUNT_PREFIX_WARNING = "Oracle stops accepting usernames with the cloud account name prefix in 26.11, on November 20, 2026 in production. Enter the username without the account name prefix.";

/** Warn only when the supplied prefix matches the account suffix of a known
 * Oracle pod hostname. Never infer an account from a vanity host or change a name.
 * Matching the whole prefix also handles account names containing hyphens.
 */
function credentialsWarning(baseUrl, username) {
  const prefix = String(username ?? "").trim().split(".")[0].toLowerCase();
  if (!prefix || !String(username ?? "").trim().includes(".")) return null;
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    const match = /^([a-z0-9-]+)\.(?:epm|pbcs)\.[a-z0-9-]+\.(?:ocs\.)?oraclecloud\.com$/.exec(host);
    return match && match[1].endsWith(`-${prefix}`) ? ACCOUNT_PREFIX_WARNING : null;
  } catch { return null; }
}

module.exports = { credentialsWarning, ACCOUNT_PREFIX_WARNING };
