# TankPulse 🔔

> High-throughput Discord event notification engine for GitHub webhooks.

TankPulse sits alongside the rest of the Tank suite (TankTelemetry · TankVault · TankGuard) and turns GitHub activity into rich, rate-limited Discord embeds. Point a webhook at the intake endpoint, map a repository to a channel with a slash command, and TankPulse handles signature verification, event parsing, queue buffering, and Discord delivery.

---

## 🚀 Key Features

* **Secure Webhook Ingestion:** Fastify endpoint with strict HMAC-SHA256 (`X-Hub-Signature-256`) verification. Invalid signatures receive a hard HTTP 401.
* **Event Parsing:** First-class support for `push`, `pull_request`, `issues`, and `release` with normalized metadata (author, branch, title, diff URL, avatar).
* **Queue & Rate-Limit Protection:** Redis + BullMQ buffer absorbs burst events so Discord API limits are never hit head-on.
* **Dynamic Embeds:** Color-coded themes (green for merges/releases, red/orange for closures and deletions, blurple for pushes and new PRs) with direct GitHub hyperlinks.
* **Slash Command Configuration:** `/configure-channel` links any GitHub repository to a Discord channel without redeploying.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Language & Runtime** | TypeScript, Node.js ≥ 20 |
| **Webhook Server** | Fastify 5 |
| **Bot Framework** | discord.js 14 |
| **Queue & Storage** | Redis, BullMQ, ioredis |
| **Security** | Node.js `crypto` (HMAC-SHA256, timing-safe compare) |

---

## 📁 Project Layout

```text
src/
  index.ts                 Bootstrap (Discord client + worker + HTTP server)
  config.ts                Typed environment loading
  server.ts                Fastify app + raw-body parser for HMAC
  bot/
    index.ts               Client setup and interaction router
    embeds.ts              Theme-aware EmbedBuilder
    register-commands.ts   One-shot slash command registration
    commands/
      configure-channel.ts /configure-channel implementation
  webhooks/
    github.ts              POST /api/webhooks/github
    verify.ts              Signature guard middleware
  parsers/
    github.ts              Event → NotificationPayload[]
  queue/
    index.ts               BullMQ queue + enqueue helper
    worker.ts              Rate-limited Discord poster
  utils/
    channel-store.ts       Redis-backed repo ↔ channel map
  types/
    github.ts
    notification.ts
```

---

## 🏗️ Architecture

```text
GitHub
    │
    │ webhook (HMAC-SHA256)
    ▼
Fastify Intake ──────► Signature Verification
    │
    │ parsed events
    ▼
Redis / BullMQ Queue
    │
    │ rate-limited worker
    ▼
Discord Bot ──────────► Channel Embeds
    ▲
    │
/configure-channel
(repo → channel map in Redis)
```

---

## ⚡ Quickstart

### 1. Prerequisites

* Node.js ≥ 20
* Redis ≥ 6 (local or managed)
* A Discord application with a bot user
* A public HTTPS URL for GitHub webhooks (ngrok, localtunnel, or production host)

### 2. Local Environment Setup

```bash
cd tankpulse
cp .env.example .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, WEBHOOK_SECRET, REDIS_URL
npm install
```

Start Redis if you are running it locally:

```bash
docker run -d --name tankpulse-redis -p 6379:6379 redis:7-alpine
```

Register slash commands (guild-scoped when `DISCORD_GUILD_ID` is set):

```bash
npm run register-commands
```

Run the service:

```bash
npm run dev
```

* **Health probe:** http://localhost:3000/health
* **Webhook endpoint:** http://localhost:3000/api/webhooks/github

---

## 🔗 GitHub Webhook Setup

Works for both **public and private** repositories. Signature verification does not depend on repository visibility.

1. Repository → **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://<your-public-host>/api/webhooks/github`
3. **Content type:** `application/json`
4. **Secret:** the same value as `WEBHOOK_SECRET` in `.env`
5. **Events:** Pushes, Pull requests, Issues, Releases (or “Send me everything” while testing)
6. Save

### Tunnel for local testing

```bash
# ngrok
ngrok http 3000

# or localtunnel
npx localtunnel --port 3000
```

Use the generated HTTPS URL as the webhook Payload URL.

---

## 🤖 Discord Configuration

Invite the bot with scopes `bot` and `applications.commands`, plus permissions for **Send Messages**, **Embed Links**, and **Use Slash Commands**.

Link a repository to a channel:

```
/configure-channel repository:owner/repo
```

Optionally target a different channel or remove a mapping:

```
/configure-channel repository:owner/repo channel:#alerts
/configure-channel repository:owner/repo remove:true
```

---

## 🎨 Embed Themes

| Event | Theme |
| :--- | :--- |
| Merged PR / Published release | Green (success) |
| Closed issue / Deleted branch / Closed unmerged PR | Red (danger) |
| Force push | Orange (warning) |
| Push / Opened PR / Opened issue | Blurple (info) |

Embeds include author avatar, short SHA or PR/issue number, direct GitHub links, and structured fields where useful.

---

## 🔐 Security & Privacy

* Webhook requests without a valid `X-Hub-Signature-256` are rejected with HTTP 401.
* The shared secret must match exactly between GitHub and `WEBHOOK_SECRET`.
* Never commit real tokens, secrets, or `.env` files.
* Keep `.env.example` limited to placeholder values.
* Use HTTPS for any publicly reachable webhook endpoint.
* The bot only posts to channels you explicitly map; no ambient listening beyond the Guilds intent required for slash commands.

---

## ⚙️ Environment Variables Reference

See `.env.example` for the complete configuration reference.

| Environment Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `DISCORD_GUILD_ID` | Optional guild ID for fast command registration during development |
| `WEBHOOK_SECRET` | Shared secret used for HMAC-SHA256 verification |
| `REDIS_URL` | Redis connection string (default `redis://localhost:6379`) |
| `PORT` | HTTP listen port (default `3000`) |
| `HOST` | HTTP bind address (default `0.0.0.0`) |
| `DISCORD_RATE_LIMIT_PER_SECOND` | Max embed jobs the worker processes per second |
| `QUEUE_REMOVE_ON_COMPLETE` | Retention for completed jobs (ms) |
| `QUEUE_REMOVE_ON_FAIL` | Retention for failed jobs (ms) |

Generate a strong webhook secret with:

```bash
openssl rand -hex 32
```

---

## 📈 Performance Notes

TankPulse is designed so GitHub never waits on Discord. The intake path verifies the signature, parses the event, enqueues normalized payloads, and returns 200. Burst pushes (many commits in one delivery) are absorbed by BullMQ and drained at a configurable rate so Discord rate limits are respected.

Actual throughput depends on Redis latency, Discord API conditions, and the configured worker limiter. Tune `DISCORD_RATE_LIMIT_PER_SECOND` and consider multiple worker processes when scaling.

---

## 🧪 Development

```bash
npm run dev              # tsx watch
npm run build && npm start
npm run register-commands
npm run typecheck
```

Optional Redis inspection:

```bash
redis-cli
> KEYS bull:tankpulse-notifications:*
> KEYS tankpulse:*
```

---

## 📄 License

TankPulse is licensed under the MIT License.