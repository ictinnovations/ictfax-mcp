#!/usr/bin/env node
/**
 * ictfax-mcp: an MCP server for ICTFax (the open-source fax server on ICTCore).
 *
 * Written by Tahir Almas at ICT Innovations (https://ictinnovations.com). It lets
 * an AI assistant list fax transmissions and check their status, and — with writes
 * enabled — upload a document and send a fax over the ICTCore REST API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ICTFaxClient } from "./client.js";
import { registerTools } from "./tools.js";

let cfg;
try {
  cfg = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (cfg.tlsInsecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const server = new McpServer(
  { name: "ictfax-mcp", version: "0.1.0" },
  {
    instructions:
      "List and track faxes on an ICTFax server over the ICTCore REST API. Start with ictfax_list_faxes, " +
      "then ictfax_get_fax_status for one transmission. Tools are read-only unless ICTFAX_MCP_ALLOW_WRITE=true, " +
      "which exposes uploading a document and sending a fax (dials a real number). " +
      "By Tahir Almas, ICT Innovations (https://ictinnovations.com).",
  }
);

registerTools(server, cfg, new ICTFaxClient(cfg));

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(
  `ictfax-mcp ready (${cfg.baseUrl}, ${cfg.allowWrite ? "write enabled" : "read-only"}). ` +
    "ICT Innovations, https://ictinnovations.com"
);
