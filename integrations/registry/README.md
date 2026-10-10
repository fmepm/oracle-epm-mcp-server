# FMEPM Connect Core Registry draft

Prepared October 10, 2026. Do not publish this draft. No DNS or Registry change
has been made. The name is `com.fmepm/connect-core`, beside the hosted entry
`com.fmepm/connect`. The same dated schema (2025-12-11) is saved here for tests.

The package entry pins the existing v2.0.0 MCPB release. GitHub reports its
SHA-256 as `ac1dc0eb5f5f04c32d14017e36383bce531ae6be7ac77710e73255d97fdad5ce`.
That existing bundle still has the old display name and username help. The
changes in this PR are source changes and have not been bundled or released.
Before publishing the entry, Fred needs a new approved bundle containing these
fixes. Update the entry version, immutable release URL and SHA-256 from that
actual artifact, then run the tests and review the package in mock mode. Do not
rename a release URL or invent a hash for an artifact that has not been built.

MCPB uses stdio and its own manifest configuration. The demo is the default.
No hosted endpoint, static token or password belongs in this entry.

## DNS record for Fred

Add this TXT record at the fmepm.com apex (host @). Keep existing TXT records.
It is the same record as the hosted server, so add it only once:

```dns
fmepm.com. IN TXT "v=MCPv1; k=ed25519; p=svXBCGXucu703GYq2LiOKuCST60sKRAd/VmQODtWCRQ="
```

The private signing key remains on Fred's laptop with the hosted project's
Registry preparation files. No private key is in this repository. Back it up
before clearing that local cache. Later publication requires explicit approval,
DNS sign-in with the official mcp-publisher and validation of the new artifact.

Sources checked October 10, 2026:
- [MCPB package format](https://modelcontextprotocol.io/registry/package-types)
- [DNS authentication](https://modelcontextprotocol.io/registry/authentication)
- [Existing release](https://github.com/fmepm/oracle-epm-mcp-server/releases/tag/v2.0.0)
