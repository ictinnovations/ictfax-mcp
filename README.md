# ictfax-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for
**[ICTFax](https://www.ictfax.org)**, the open-source fax server built on the
ICTCore framework by [ICT Innovations](https://ictinnovations.com).

It lets an AI assistant list fax transmissions and check their status, and — only
when you turn writes on — upload a document and send a fax.

## Install

```bash
npx -y ictfax-mcp      # no install
npm install -g ictfax-mcp
```

Requires Node.js 18 or newer.

## Configure

| Variable | Required | Default | |
|----------|----------|---------|--|
| `ICTFAX_BASE_URL` | yes | | ICTCore REST base, normally ending in `/api`, e.g. `https://your-ictfax/api` |
| `ICTFAX_USERNAME` | yes | | API account email (ICTCore logs in by email) |
| `ICTFAX_PASSWORD` | yes | | Password for that account |
| `ICTFAX_ACCOUNT_ID` | no | `1` | Account id to send faxes from |
| `ICTFAX_MCP_ALLOW_WRITE` | no | `false` | Unlock upload/send (see Safety) |
| `ICTFAX_TIMEOUT_MS` | no | `30000` | Per-request timeout |
| `ICTFAX_TLS_INSECURE` | no | `false` | Skip TLS verification — self-signed test servers only |

### Claude Desktop example

```json
{
  "mcpServers": {
    "ictfax": {
      "command": "npx",
      "args": ["-y", "ictfax-mcp"],
      "env": {
        "ICTFAX_BASE_URL": "https://your-ictfax/api",
        "ICTFAX_USERNAME": "admin@example.com",
        "ICTFAX_PASSWORD": "your-password"
      }
    }
  }
}
```

## Tools

Read tools are always available:

| Tool | What it does |
|------|--------------|
| `ictfax_list_faxes` | List fax transmissions (id, contact, status, direction) |
| `ictfax_get_fax_status` | Status of one transmission by id |

Write tools appear only when `ICTFAX_MCP_ALLOW_WRITE=true`:

| Tool | What it does |
|------|--------------|
| `ictfax_upload_document` | Upload a local PDF as a fax document; returns a document_id |
| `ictfax_send_fax` | Send a local document as a fax to a number — dials a real number |

## Safety

The server is **read-only by default**. Sending a fax dials a real number and can
cost money, so `ictfax_upload_document` and `ictfax_send_fax` are not registered at
all unless you set `ICTFAX_MCP_ALLOW_WRITE=true`.

## How it connects

ICTFax runs on ICTCore, which authenticates with a JWT from `POST /authenticate`
(login by email) and reads it back from the `Authorization: Bearer` header. Sending
a fax is a short chain the server handles for you: upload the document (metadata
then raw bytes, which ICTFax converts to fax format), create the recipient and a
sendfax program, create the transmission and send it.

## About

Built by Tahir Almas at [ICT Innovations](https://ictinnovations.com) — the team
behind ICTFax, ICTPBX, ICTContact, ICTDialer and the ICTCore framework these share.
ICTFax is free and open source; learn more at [ictfax.org](https://www.ictfax.org).

MIT licensed. Issues and PRs welcome at
[github.com/ictinnovations/ictfax-mcp](https://github.com/ictinnovations/ictfax-mcp).
