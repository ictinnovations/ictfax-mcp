/**
 * Configuration for ictfax-mcp.
 *
 * Part of ictfax-mcp by Tahir Almas, ICT Innovations (https://ictinnovations.com).
 */

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  accountId: number;
  allowWrite: boolean;
  timeoutMs: number;
  tlsInsecure: boolean;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function bool(value: string | undefined): boolean {
  return /^(1|true|yes)$/i.test(value ?? "");
}

/**
 * Read config from the environment. Throws a clear error when a required value is
 * missing, so the server fails at startup rather than on the first tool call.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // ICTFAX_BASE_URL is the ICTCore REST base, which normally ends in /api,
  // e.g. https://your-ictfax/api. Trailing slashes are trimmed.
  const baseUrl = (env.ICTFAX_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const username = (env.ICTFAX_USERNAME ?? "").trim();
  const password = env.ICTFAX_PASSWORD ?? "";

  const missing: string[] = [];
  if (!baseUrl) missing.push("ICTFAX_BASE_URL");
  if (!username) missing.push("ICTFAX_USERNAME");
  if (!password) missing.push("ICTFAX_PASSWORD");
  if (missing.length) {
    throw new Error(
      `ictfax-mcp: missing required config: ${missing.join(", ")}.\n` +
        "See https://github.com/ictinnovations/ictfax-mcp for the full variable list."
    );
  }

  return {
    baseUrl,
    username,
    password,
    accountId: num(env.ICTFAX_ACCOUNT_ID, 1),
    allowWrite: bool(env.ICTFAX_MCP_ALLOW_WRITE),
    timeoutMs: num(env.ICTFAX_TIMEOUT_MS, 30000),
    tlsInsecure: bool(env.ICTFAX_TLS_INSECURE),
  };
}
