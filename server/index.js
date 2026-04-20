#!/usr/bin/env node

/**
 * Oracle EPM Cloud MCP Server
 * ===========================
 * Built by Fred Mamadjanov (fmepm.com)
 *
 * Connects Claude (or any MCP client) to Oracle EPM Cloud
 * via the Planning REST APIs.
 *
 * Modes:
 *   MOCK mode (default) — returns realistic sample responses
 *   LIVE mode — calls your actual Oracle EPM Cloud environment
 *
 * To switch to LIVE mode, set these environment variables:
 *   EPM_BASE_URL=https://epm-YOURDOMAIN.epm.REGION.oraclecloud.com
 *   EPM_USERNAME=IDENTITYDOMAIN.your_username
 *   EPM_PASSWORD=your_password
 *   EPM_APP_NAME=Vision
 *   EPM_MODE=live
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

// Configuration
const CONFIG = {
  mode: (process.env.EPM_MODE || "mock").toLowerCase(),
  baseUrl: process.env.EPM_BASE_URL || "https://epm-demo.epm.us6.oraclecloud.com",
  username: process.env.EPM_USERNAME || "",
  password: process.env.EPM_PASSWORD || "",
  appName: process.env.EPM_APP_NAME || "Vision",
};
const IS_MOCK = CONFIG.mode === "mock";

// HTTP helper for LIVE mode
async function epmFetch(method, path, body) {
  const fetch = require("node-fetch");
  const url = CONFIG.baseUrl + path;
  const auth = Buffer.from(CONFIG.username + ":" + CONFIG.password).toString("base64");
  const opts = {
    method,
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { rawResponse: text }; }
  return { status: res.status, data };
}

// Mock responses based on actual Oracle EPM REST API documentation
const MOCK = {
  apiVersion: { status: 200, data: { items: [{ version: "v3", lifecycle: "active", isLatest: true }, { version: "v2", lifecycle: "deprecated", isLatest: false }] } },
  applications: { status: 200, data: { items: [{ name: "Vision", type: "Planning", status: "Active", description: "Vision Planning Application", createdBy: "admin", lastModified: "2026-04-01T10:30:00Z" }, { name: "VisionFCCS", type: "ConsolidationAndClose", status: "Active", description: "Vision Financial Consolidation", createdBy: "admin", lastModified: "2026-03-28T14:15:00Z" }] } },
  substitutionVariables: { status: 200, data: { items: [{ name: "CurrMonth", value: "Mar", planType: "ALL" }, { name: "CurrYear", value: "FY26", planType: "ALL" }, { name: "PriorMonth", value: "Feb", planType: "ALL" }, { name: "PriorYear", value: "FY25", planType: "ALL" }, { name: "CurrScenario", value: "Forecast", planType: "Plan1" }, { name: "BudgetYear", value: "FY27", planType: "Plan1" }, { name: "RateVersion", value: "Avg_Rate", planType: "Plan2" }] } },
  runBusinessRule: { status: 200, data: { jobId: 48291, status: -1, descriptiveStatus: "Processing", jobType: "RULES", jobName: "Agg_AllData", details: null } },
  jobStatusComplete: { status: 200, data: { jobId: 48291, status: 0, descriptiveStatus: "Completed", jobType: "RULES", jobName: "Agg_AllData", details: "Business rule Agg_AllData completed successfully. Elapsed time: 4.2 seconds." } },
  exportDataSlice: { status: 200, data: { headers: ["Account", "Period", "Scenario", "Entity", "Version", "Data"], rows: [["Revenue", "Jan", "Actual", "North America", "Working", 1250000], ["Revenue", "Feb", "Actual", "North America", "Working", 1340000], ["Revenue", "Mar", "Actual", "North America", "Working", 1185000], ["COGS", "Jan", "Actual", "North America", "Working", 875000], ["COGS", "Feb", "Actual", "North America", "Working", 938000], ["COGS", "Mar", "Actual", "North America", "Working", 829500], ["Operating Expenses", "Jan", "Actual", "North America", "Working", 210000], ["Operating Expenses", "Feb", "Actual", "North America", "Working", 225000], ["Operating Expenses", "Mar", "Actual", "North America", "Working", 198000], ["Net Income", "Jan", "Actual", "North America", "Working", 165000], ["Net Income", "Feb", "Actual", "North America", "Working", 177000], ["Net Income", "Mar", "Actual", "North America", "Working", 157500]], exportInfo: { totalRows: 12, planType: "Plan1", exportTime: "2026-04-05T14:30:00Z" } } },
};

// Create server
const server = new McpServer({
  name: "oracle-epm-cloud",
  version: "1.0.0",
});

// Tool 1: Get API Version
server.tool(
  "get_api_version",
  "Discover which REST API versions your Oracle EPM Cloud environment supports. Run this first to confirm connectivity.",
  async () => {
    const result = IS_MOCK ? MOCK.apiVersion : await epmFetch("GET", "/HyperionPlanning/rest/");
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] API Version (HTTP " + result.status + "):\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 2: List Applications
server.tool(
  "list_applications",
  "List all applications in the Oracle EPM Cloud environment — Planning, FCCS, PCM, FreeForm, etc.",
  async () => {
    const result = IS_MOCK ? MOCK.applications : await epmFetch("GET", "/HyperionPlanning/rest/v3/applications");
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Applications (HTTP " + result.status + "):\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 3: Get Substitution Variables
server.tool(
  "get_substitution_variables",
  "Read all substitution variables for a given application. These control which period, year, scenario, and version the application uses.",
  { appName: z.string().optional().describe("Application name (default: Vision)") },
  async ({ appName }) => {
    const app = appName || CONFIG.appName;
    const result = IS_MOCK ? MOCK.substitutionVariables : await epmFetch("GET", "/HyperionPlanning/rest/v3/applications/" + app + "/substitutionvariables");
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Substitution Variables for " + app + " (HTTP " + result.status + "):\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 4: Run Business Rule
server.tool(
  "run_business_rule",
  "Execute a business rule (calculation script) in the EPM application. Returns a job ID you can poll for completion.",
  { ruleName: z.string().describe("Name of the business rule to run, e.g. Agg_AllData"), appName: z.string().optional().describe("Application name (default: Vision)") },
  async ({ ruleName, appName }) => {
    const app = appName || CONFIG.appName;
    let result;
    if (IS_MOCK) {
      result = { status: 200, data: { ...MOCK.runBusinessRule.data, jobName: ruleName } };
    } else {
      result = await epmFetch("POST", "/HyperionPlanning/rest/v3/applications/" + app + "/jobs", { jobType: "RULES", jobName: ruleName });
    }
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Business Rule " + ruleName + " submitted (HTTP " + result.status + "):\n\nJob ID: " + result.data.jobId + "\nStatus: " + result.data.descriptiveStatus + "\n\nUse check_job_status with job ID " + result.data.jobId + " to monitor progress.\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 5: Check Job Status
server.tool(
  "check_job_status",
  "Poll the status of a running job. Status: -1=Processing, 0=Completed, 1=Error, 2=Cancelled.",
  { jobId: z.number().describe("The job ID returned from run_business_rule"), appName: z.string().optional().describe("Application name (default: Vision)") },
  async ({ jobId, appName }) => {
    const app = appName || CONFIG.appName;
    const result = IS_MOCK ? MOCK.jobStatusComplete : await epmFetch("GET", "/HyperionPlanning/rest/v3/applications/" + app + "/jobs/" + jobId);
    const statusMap = { "-1": "Processing", "0": "Completed", "1": "Error", "2": "Cancelled" };
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Job " + jobId + ": " + (statusMap[String(result.data.status)] || "Unknown") + "\nDetails: " + (result.data.details || "N/A") + "\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 6: Export Data Slice
server.tool(
  "export_data_slice",
  "Export a slice of data from the EPM cube. Specify dimension members to filter.",
  { scenario: z.string().optional().describe("e.g. Actual, Budget, Forecast"), year: z.string().optional().describe("e.g. FY26"), period: z.string().optional().describe("e.g. Jan, Q1"), entity: z.string().optional().describe("e.g. North America"), account: z.string().optional().describe("e.g. Revenue"), appName: z.string().optional().describe("Application name (default: Vision)") },
  async ({ scenario, year, period, entity, account, appName }) => {
    const app = appName || CONFIG.appName;
    const pov = {};
    if (scenario) pov.Scenario = scenario;
    if (year) pov.Year = year;
    if (period) pov.Period = period;
    if (entity) pov.Entity = entity;
    if (account) pov.Account = account;
    let result;
    if (IS_MOCK) {
      result = MOCK.exportDataSlice;
    } else {
      result = await epmFetch("POST", "/HyperionPlanning/rest/v3/applications/" + app + "/plantypes/Plan1/exportdataslice", { exportPlanningData: true, gridDefinition: { suppressMissingBlocks: true, pov } });
    }
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Data Export for " + app + " (HTTP " + result.status + "):\n\nPOV: " + JSON.stringify(pov) + "\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Tool 7: Update Substitution Variable
server.tool(
  "update_substitution_variable",
  "Update a substitution variable value. Example: roll CurrMonth from Mar to Apr during month-end close.",
  { variableName: z.string().describe("Variable name, e.g. CurrMonth"), newValue: z.string().describe("New value, e.g. Apr"), planType: z.string().optional().describe("Plan type scope, default ALL"), appName: z.string().optional().describe("Application name (default: Vision)") },
  async ({ variableName, newValue, planType, appName }) => {
    const app = appName || CONFIG.appName;
    const pt = planType || "ALL";
    let result;
    if (IS_MOCK) {
      result = { status: 200, data: { message: "Substitution variable updated successfully.", variable: { name: variableName, value: newValue, planType: pt } } };
    } else {
      result = await epmFetch("PUT", "/HyperionPlanning/rest/v3/applications/" + app + "/substitutionvariables", { items: [{ name: variableName, value: newValue, planType: pt }] });
    }
    return { content: [{ type: "text", text: "[" + (IS_MOCK ? "MOCK" : "LIVE") + "] Updated " + variableName + " to " + newValue + " (HTTP " + result.status + "):\n\n" + JSON.stringify(result.data, null, 2) }] };
  }
);

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Oracle EPM Cloud MCP Server started in " + (IS_MOCK ? "MOCK" : "LIVE") + " mode");
}
main().catch((e) => { console.error("Failed:", e); process.exit(1); });
