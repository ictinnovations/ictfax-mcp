/**
 * ICTFax tools exposed over MCP.
 *
 * Read tools are always registered. The write tools — upload a document and send a
 * fax — only appear when ICTFAX_MCP_ALLOW_WRITE is set, since sending a fax dials a
 * real number and can cost money.
 *
 * Part of ictfax-mcp by Tahir Almas, ICT Innovations (https://ictinnovations.com).
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import type { ICTFaxClient } from "./client.js";
import { json, text, toolError } from "./format.js";

export function registerTools(server: McpServer, cfg: Config, client: ICTFaxClient): void {
  server.registerTool(
    "ictfax_list_faxes",
    {
      title: "List fax transmissions",
      description:
        "List fax transmissions on the server (inbound and outbound) with their id, contact, status " +
        "and direction. Start here to find a transmission id.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => { try { return json(await client.listFaxes()); } catch (e) { return toolError(e); } }
  );

  server.registerTool(
    "ictfax_get_fax_status",
    {
      title: "Get fax status",
      description:
        "Get one fax transmission by id: its status (processing, completed, failed), contact and pages. " +
        "Poll this after sending a fax.",
      inputSchema: { transmission_id: z.number().int().describe("The transmission id.") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ transmission_id }) => { try { return json(await client.faxStatus(transmission_id)); } catch (e) { return toolError(e); } }
  );

  if (!cfg.allowWrite) return;

  // ---- writes (only when ICTFAX_MCP_ALLOW_WRITE is set) -----------------
  server.registerTool(
    "ictfax_upload_document",
    {
      title: "Upload a fax document",
      description:
        "Upload a local PDF (or other supported file) as a fax document and return its document_id, " +
        "which the server converts to fax format. Use the id with ictfax_send_fax.",
      inputSchema: {
        file_path: z.string().describe("Absolute path to a local file on this machine."),
        name: z.string().optional().describe("Optional document name (defaults to the file name)."),
        mime: z.string().optional().describe("MIME type, default application/pdf."),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ file_path, name, mime }) => {
      try {
        const id = await client.uploadDocument(file_path, name, mime ?? "application/pdf");
        return text(`Uploaded. document_id=${id}`);
      } catch (e) { return toolError(e); }
    }
  );

  server.registerTool(
    "ictfax_send_fax",
    {
      title: "Send a fax",
      description:
        "Send a local document as a fax to a phone number. THIS DIALS A REAL NUMBER and can cost money. " +
        "Uploads the file, creates the recipient and transmission, and sends it; returns the transmission id.",
      inputSchema: {
        to_number: z.string().describe("Recipient fax number in international format, e.g. +12125550123."),
        file_path: z.string().describe("Absolute path to a local document (PDF) on this machine."),
        title: z.string().optional().describe("Fax title, default 'Fax'."),
        recipient_name: z.string().optional().describe("Recipient name, default 'Fax recipient'."),
        mime: z.string().optional().describe("MIME type of the document, default application/pdf."),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async ({ to_number, file_path, title, recipient_name, mime }) => {
      try {
        const id = await client.sendFax(
          to_number, file_path, title ?? "Fax", recipient_name ?? "Fax recipient", mime ?? "application/pdf");
        return text(`Fax queued. transmission_id=${id}. Poll ictfax_get_fax_status(${id}) for delivery.`);
      } catch (e) { return toolError(e); }
    }
  );
}
