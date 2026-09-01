/**
 * Output helpers. MCP tool results are text; JSON payloads from ICTExam are
 * pretty-printed and clamped so a single call cannot flood the context window.
 *
 * Part of ictexam-mcp by Tahir Almas, ICT Innovations (https://ictinnovations.com).
 */

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export function text(body: string, isError = false): ToolResult {
  return { content: [{ type: "text", text: body }], ...(isError ? { isError: true } : {}) };
}

export function toolError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return text(`Error: ${message}`, true);
}

export function clamp(body: string, maxChars = 20000): string {
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars)}\n\n[truncated ${body.length - maxChars} more characters]`;
}

/** Render an ICTExam JSON payload as clamped, pretty JSON text. */
export function json(payload: unknown): ToolResult {
  return text(clamp(JSON.stringify(payload, null, 2)));
}
