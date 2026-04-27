# Oracle EPM Cloud MCP Server

Connect Claude AI (or any MCP-compatible client) to Oracle EPM Cloud via REST APIs.

Built by Fred Mamadjanov, Oracle ACE and EPM Solution Architect. More at [fmepm.com](https://fmepm.com).

> **If this saved you time, please [star the repo](https://github.com/fmepm/oracle-epm-mcp-server). Stars are how other Oracle EPM folks find this work, and it's the clearest signal I have that it's useful.**

---

## What This Does

This MCP server gives AI agents the ability to interact with Oracle EPM Cloud. Instead of manually running Postman calls or EPM Automate commands, you can ask Claude to:

- **"What applications are in my EPM environment?"**
- **"Show me the current substitution variables"**
- **"Run the Agg_AllData business rule"**
- **"Export Q1 revenue data for North America"**
- **"Roll the current month forward from Mar to Apr"**

The server translates these natural language requests into Oracle EPM REST API calls.

---

## 📺 Video Tutorials and Full Articles

**Episode 2: How I Built This**
Building an AI agent for Oracle EPM Cloud using MCP and REST APIs.
- Watch on YouTube: [youtu.be/At4_ZIq2jBY](https://youtu.be/At4_ZIq2jBY)
- Full article on fmepm.com: [How to Connect Claude AI to Oracle EPM Cloud](https://fmepm.com/ai-agent-oracle-epm)

**Episode 3: How to Set Up (Step by Step)**
Install and configure this MCP server in 5 minutes.
- Watch on YouTube: [youtu.be/kgUDAKARk7c](https://youtu.be/kgUDAKARk7c)
- Full setup guide on fmepm.com: [How to Set Up an AI Agent for Oracle EPM Cloud](https://fmepm.com/setup-ai-agent-oracle-epm)

---

## Architecture

```
You (natural language) → Claude Desktop → MCP Protocol → This Server → Oracle EPM REST APIs → Your EPM Cloud
```

---

## Available Tools

| Tool | What It Does | EPM REST API |
|------|-------------|--------------|
| `get_api_version` | Test connectivity, discover API versions | `GET /HyperionPlanning/rest/` |
| `list_applications` | List all EPM applications | `GET /HyperionPlanning/rest/v3/applications` |
| `get_substitution_variables` | Read current month, year, scenario variables | `GET .../substitutionvariables` |
| `run_business_rule` | Execute a calc script or business rule | `POST .../jobs` |
| `check_job_status` | Poll whether a job completed or errored | `GET .../jobs/{jobId}` |
| `export_data_slice` | Pull data from the cube by dimension members | `POST .../exportdataslice` |
| `update_substitution_variable` | Change a substitution variable value | `PUT .../substitutionvariables` |

---

## Install

Two options. Pick the one that fits how you work.

### Option A: One-Click Install (Recommended)

Available in v2.0.0 and later. Download the Desktop Extension, install it, done. No path editing, no JSON config file.

1. Download `oracle-epm-cloud-2.0.0.mcpb` from the [latest release](https://github.com/fmepm/oracle-epm-mcp-server/releases/latest).
2. Open Claude Desktop. Go to Settings → Extensions → Advanced → Install Extension.
3. Select the `.mcpb` file.
4. That's it. Mock mode works out of the box. No Oracle credentials needed to test.

For live mode (real EPM environment), configure your environment variables through Claude Desktop's extension settings.

### Option B: Manual Install (For Developers)

Use this if you want to read or modify the code.

**Prerequisites**

- Node.js 18+ installed ([download](https://nodejs.org))
- Claude Desktop installed ([download](https://claude.ai/download))

> **Need a video walkthrough?** Watch [Episode 3 on YouTube](https://youtu.be/kgUDAKARk7c) or read the [step-by-step guide on fmepm.com](https://fmepm.com/setup-ai-agent-oracle-epm).

**Step 1: Clone and install**

```bash
git clone https://github.com/fmepm/oracle-epm-mcp-server.git
cd oracle-epm-mcp-server
npm install
```

**Step 2: Configure Claude Desktop**

Open Claude Desktop → Settings → Developer → Edit Config.

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oracle-epm-cloud": {
      "command": "node",
      "args": ["/FULL/PATH/TO/oracle-epm-mcp-server/server/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path on your machine.

Windows example:

```json
{
  "mcpServers": {
    "oracle-epm-cloud": {
      "command": "node",
      "args": ["C:\\Users\\Fred\\oracle-epm-mcp-server\\server\\index.js"]
    }
  }
}
```

Mac example:

```json
{
  "mcpServers": {
    "oracle-epm-cloud": {
      "command": "node",
      "args": ["/Users/fred/oracle-epm-mcp-server/server/index.js"]
    }
  }
}
```

**Step 3: Restart Claude Desktop**

Quit Claude Desktop completely and reopen it. You should see the MCP tools icon (hammer) in the chat input area. Click it to verify "oracle-epm-cloud" is listed.

**Step 4: Try it**

Type in Claude Desktop:

> "What EPM applications are available in my environment?"

Claude will use the `list_applications` tool and return the mock data.

---

## Switching to Live Mode (Real EPM Environment)

When you have access to an Oracle EPM Cloud environment, set these environment variables in your Claude Desktop config:

```json
{
  "mcpServers": {
    "oracle-epm-cloud": {
      "command": "node",
      "args": ["/FULL/PATH/TO/oracle-epm-mcp-server/server/index.js"],
      "env": {
        "EPM_MODE": "live",
        "EPM_BASE_URL": "https://epm-YOURDOMAIN.epm.REGION.oraclecloud.com",
        "EPM_USERNAME": "IDENTITYDOMAIN.your_username",
        "EPM_PASSWORD": "your_password",
        "EPM_APP_NAME": "Vision"
      }
    }
  }
}
```

Same 7 tools, now hitting your real environment.

### Authentication Note

The REST APIs use Basic Authentication. Your username format must be `identitydomain.username`. This is the single most common mistake. If you get 401 errors, check this first.

Accounts with multi-factor authentication (MFA) enabled cannot use Basic Auth. You'd need OAuth 2.0 instead, which isn't covered in this version.

---

## Month-End Close Automation Example

Here's the sequence an AI agent would follow to automate a month-end close:

1. **Check current period:** `get_substitution_variables` sees CurrMonth = "Mar"
2. **Run aggregation:** `run_business_rule` with "Agg_AllData"
3. **Wait for completion:** `check_job_status` with the returned job ID
4. **Validate data:** `export_data_slice` for Revenue, COGS, Net Income
5. **Roll period forward:** `update_substitution_variable` CurrMonth from "Mar" to "Apr"
6. **Confirm:** `get_substitution_variables` verifies CurrMonth = "Apr"

This is the same workflow a finance team does manually each month. Now executable through natural language.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| MCP tools not showing in Claude | Config path wrong | Check `claude_desktop_config.json` path is absolute |
| 401 Unauthorized | Username format | Use `identitydomain.username`, not just username |
| 403 Forbidden | Insufficient permissions | User needs EPM admin or appropriate role |
| Connection refused | Wrong URL | Check `EPM_BASE_URL` matches your environment |
| ETIMEDOUT | Network/firewall | Verify you can reach the EPM URL from your machine |

---

## What's Next

- **OAuth 2.0 support** for environments with MFA enabled
- **FCCS-specific tools:** consolidation, intercompany elimination
- **Data integration tools:** file upload and download via Migration APIs
- **Groovy rule execution:** run Groovy scripts via REST API

---

## About

This server is part of an ongoing series on connecting AI agents to Oracle EPM Cloud. For more Oracle EPM content, tutorials, and tools:

- **Overview article:** [How to Connect Claude AI to Oracle EPM Cloud](https://fmepm.com/ai-agent-oracle-epm)
- **Setup tutorial:** [How to Set Up an AI Agent for Oracle EPM Cloud, Step by Step](https://fmepm.com/setup-ai-agent-oracle-epm)
- **All insights and articles:** [fmepm.com/insights](https://fmepm.com/insights)
- **YouTube channel:** [@fmepm](https://youtube.com/@fmepm)
- **Website:** [fmepm.com](https://fmepm.com)
- **LinkedIn:** [Fred Mamadjanov](https://linkedin.com/in/fredmjvca)

Work with Oracle EPM and want to discuss AI integration? [Book a Discovery Call](https://outlook.office.com/book/EPMDiscoveryCall30min@fmepm.com).

---

*This is not an Oracle product. Oracle EPM Cloud is a trademark of Oracle Corporation.*
