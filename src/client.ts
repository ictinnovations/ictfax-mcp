/**
 * HTTP client for the ICTCore REST API behind ICTFax.
 *
 * ICTCore authenticates with a JWT from `POST /authenticate` (login by email) and
 * reads it back from the `Authorization: Bearer` header. Create endpoints return a
 * bare numeric id. Sending a fax is a chain: upload a document (metadata then raw
 * bytes), create a contact and a sendfax program, create a transmission, send it.
 *
 * Part of ictfax-mcp by Tahir Almas, ICT Innovations (https://ictinnovations.com).
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Config } from "./config.js";

export class ICTFaxError extends Error {}

export class ICTFaxClient {
  private token: string | null = null;

  constructor(private cfg: Config) {}

  private controller(): { signal: AbortSignal; done: () => void } {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), this.cfg.timeoutMs);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  private async authenticate(): Promise<string> {
    const { signal, done } = this.controller();
    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseUrl}/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: this.cfg.username, password: this.cfg.password }),
        signal,
      });
    } finally {
      done();
    }
    if (res.status === 401) throw new ICTFaxError("Invalid ICTFax credentials");
    if (!res.ok) throw new ICTFaxError(`Authenticate failed: HTTP ${res.status}`);
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new ICTFaxError("ICTCore authenticate returned no token");
    this.token = body.token;
    return this.token;
  }

  private async raw(method: string, path: string, init: {
    json?: unknown; bytes?: Uint8Array; contentType?: string;
  } = {}): Promise<unknown> {
    if (!this.token) await this.authenticate();

    const call = async (): Promise<Response> => {
      const headers: Record<string, string> = { Authorization: `Bearer ${this.token}`, Accept: "application/json" };
      let body: string | Uint8Array | undefined;
      if (init.bytes !== undefined) {
        body = init.bytes;
        headers["Content-Type"] = init.contentType ?? "application/octet-stream";
      } else if (init.json !== undefined) {
        body = JSON.stringify(init.json);
        headers["Content-Type"] = "application/json";
      }
      const { signal, done } = this.controller();
      try {
        return await fetch(`${this.cfg.baseUrl}/${path.replace(/^\/+/, "")}`, { method, headers, body, signal });
      } finally {
        done();
      }
    };

    let res = await call();
    if (res.status === 401) {
      await this.authenticate();
      res = await call();
    }
    const textBody = await res.text();
    if (!res.ok) {
      let detail = textBody;
      try { const j = JSON.parse(textBody); detail = j.message ?? j.error ?? textBody; } catch { /* keep text */ }
      throw new ICTFaxError(`HTTP ${res.status}: ${detail}`);
    }
    if (!textBody) return null;
    try { return JSON.parse(textBody); } catch { return textBody; }
  }

  /** ICTCore create endpoints return a bare id; tolerate object shapes too. */
  private static id(resp: unknown): number {
    if (typeof resp === "number") return Math.trunc(resp);
    if (typeof resp === "string" && /^-?\d+$/.test(resp.trim())) return parseInt(resp.trim(), 10);
    if (resp && typeof resp === "object") {
      for (const k of ["document_id", "contact_id", "program_id", "transmission_id", "id"]) {
        const v = (resp as Record<string, unknown>)[k];
        if (v !== undefined && v !== null) return Number(v);
      }
    }
    throw new ICTFaxError(`Expected an id, got ${JSON.stringify(resp)}`);
  }

  // ---- reads ------------------------------------------------------------
  listFaxes() { return this.raw("GET", "transmissions"); }
  faxStatus(transmissionId: number) { return this.raw("GET", `transmissions/${transmissionId}`); }

  // ---- writes -----------------------------------------------------------
  async uploadDocument(filePath: string, name?: string, mime = "application/pdf"): Promise<number> {
    const meta = await this.raw("POST", "documents", { json: { name: name ?? basename(filePath) } });
    const docId = ICTFaxClient.id(meta);
    const bytes = new Uint8Array(await readFile(filePath));
    await this.raw("POST", `documents/${docId}/media`, { bytes, contentType: mime });
    return docId;
  }

  async sendFax(toNumber: string, filePath: string, title = "Fax",
                recipientName = "Fax recipient", mime = "application/pdf"): Promise<number> {
    const documentId = await this.uploadDocument(filePath, title, mime);
    const contactId = ICTFaxClient.id(
      await this.raw("POST", "contacts", { json: { first_name: recipientName, phone: toNumber } }));
    const programId = ICTFaxClient.id(
      await this.raw("POST", "programs/sendfax", { json: { name: title, document_id: documentId } }));
    const transmissionId = ICTFaxClient.id(
      await this.raw("POST", "transmissions", { json: {
        title, contact_id: contactId, program_id: programId,
        account_id: this.cfg.accountId, direction: "outbound",
      } }));
    await this.raw("POST", `transmissions/${transmissionId}/send`);
    return transmissionId;
  }
}
