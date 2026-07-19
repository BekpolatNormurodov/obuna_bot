# Movie Subscription Telegram Bot — Design

## Overview

A Telegram bot that serves movies to users by number or title search, gated
behind mandatory subscription to a set of admin-managed channels. Admins
upload movies by forwarding/sending a video directly to the bot; the bot
stores only Telegram's `file_id`, never re-uploading the file to any server.

## Goals

- Users retrieve a movie by sending its number or searching by title.
- Users must be subscribed to all admin-configured channels to receive movies.
- Admins manage the required-channel list from within the bot.
- Admins upload/replace movies by forwarding video to the bot; no manual
  file server, no re-upload — `file_id` is the only thing persisted.

## Non-Goals

- No self-service admin management (admins are a fixed list, not editable
  from the bot).
- No payment, ratings, comments, or any feature beyond browse/search/gate.
- No video transcoding or file storage outside Telegram itself.

## Stack

- **Framework:** NestJS
- **Telegram integration:** `nestjs-telegraf` (Telegraf wrapped in NestJS
  modules/decorators — `@Start`, `@On`, `@Action`)
- **ORM/DB:** Prisma + MySQL, matching the local-infra pattern used in other
  projects (no Docker/Redis required)
- **Transport:** long polling (no webhook infra needed at this scale)

## Data Model (Prisma)

```prisma
model Movie {
  id        Int      @id @default(autoincrement()) // "kino raqami" shown to users
  title     String
  fileId    String                                  // Telegram file_id only
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Channel {
  id        Int      @id @default(autoincrement())
  chatId    String   @unique  // e.g. "-1002949185784"
  username  String?           // public @username, null if private
  title     String            // display name, auto-fetched via getChat
  inviteUrl String?           // set only when no public username exists
  createdAt DateTime @default(now())
}

model PendingUpload {
  id            Int          @id @default(autoincrement())
  adminId       BigInt       @unique  // one in-flight upload per admin
  fileId        String
  caption       String?                // suggested title from Telegram caption
  step          PendingStep
  targetMovieId Int?                   // set only when replacing an existing movie
  createdAt     DateTime     @default(now())
}

enum PendingStep {
  WAITING_TITLE
  WAITING_EDIT_NUMBER
}
```

Admins are **not** stored in the database — they are a fixed list of
Telegram user IDs read from `.env` (`ADMIN_IDS=7548669824,2053690211`,
corresponding to `@mobiledoctor_fix` and `@MrDeveloper2827`). An `AdminGuard`
checks incoming update `from.id` against this list for all admin-only
handlers.

## User Flow

1. **`/start`** (and before every content-serving action): the bot checks
   the user's membership in every row of `Channel` via `getChatMember`.
   - Not subscribed to one or more → reply with each channel rendered as an
     inline URL button labeled with its `title`, linking to
     `https://t.me/<username>` (public) or the stored `inviteUrl` (private),
     plus a **"✅ Tekshirish"** button that re-runs the check.
   - Subscribed to all → welcome message explaining usage.
2. **Getting a movie:**
   - Bare numeric text message (e.g. `120`) → looked up as `Movie.id`.
   - `/search <query>` → if `<query>` is numeric, same as above; otherwise a
     `title LIKE` search against `Movie`, returned as a list of
     number+title buttons.
   - No match → "Bunday kino topilmadi" (no crash, no silent failure).
   - Every lookup re-checks subscription first (a user could unsubscribe
     between actions).

## Admin Flow

### Uploading / replacing a movie

1. Admin sends or forwards a video to the bot. Its caption (if present) is
   captured as a suggested title.
2. Bot upserts a `PendingUpload` row keyed by `adminId` (overwriting any
   stale in-flight upload from the same admin — no orphaned flows) and
   replies with inline buttons: **💾 Yangi kino** / **✏️ Mavjudini
   almashtirish**.
3. **Yangi kino:** bot asks for a title (suggesting the caption, if any).
   On receiving text, creates the `Movie` row and replies with its assigned
   number: "✅ Saqlandi, raqami: **{id}**". `PendingUpload` row deleted.
4. **Mavjudini almashtirish:** bot asks for the movie number to replace.
   On receiving a number, validates it exists, shows the current title for
   confirmation, then updates that `Movie.fileId` (title unchanged unless
   the admin also sends a new one). Replies "✅ #{id} yangilandi".
   `PendingUpload` row deleted.
5. `/cancel` clears any in-flight `PendingUpload` for that admin.

### Channel management (`/kanallar`)

- Lists all channels as buttons (label = `title`); tapping one shows
  **Tahrirlash / O'chirish**.
- **➕ Qo'shish** prompts for a `@username` or numeric `chatId`. The bot
  resolves it via `getChat` (public channel → stores `username`+`title`;
  private channel → also calls `exportChatInviteLink`, requires the bot to
  already be an admin in that channel, and stores the result as
  `inviteUrl`). Admin never types the display name by hand.
- **Tahrirlash** re-prompts for a new `@username`/`chatId` and re-resolves
  the same way; **O'chirish** deletes after a confirm step.
- All of `/kanallar` is gated by `AdminGuard`.

Known seed data for initial setup:
- Channel: **AZARTNIK UZ**, `chatId = -1002949185784`

## UI Copy & Language

All bot-facing text — messages, button labels, error text — is written in
**Uzbek (Latin script)**, consistently across the whole bot. No mixed
languages, no leftover English defaults from libraries. Style rules:

- Buttons carry one leading emoji + short Uzbek label (already established:
  **✅ Tekshirish**, **💾 Yangi kino**, **✏️ Mavjudini almashtirish**,
  **➕ Qo'shish**, **🗑 O'chirish**).
- Confirmation/success messages start with ✅, errors/warnings with ⚠️, for
  quick visual scanning (e.g. "✅ Saqlandi, raqami: 42", "⚠️ Bunday kino
  topilmadi").
- Tone is direct and friendly, matching how the flows were described
  throughout this spec (`Bunday kino topilmadi`, `Bot bu kanalda admin
  emas...`) — every new message added during implementation should follow
  the same tone rather than a generic/library-default phrasing.
- A single `messages.ts` (or `bot-texts.ts`) constants module centralizes all
  user-facing strings, so wording stays consistent and is easy to review/tweak
  in one place instead of scattered inline strings across handlers.

## Error Handling

- Non-admin sending a video or hitting admin commands → ignored (or a
  generic "no access" reply), never treated as an upload attempt.
- Movie lookup/search with no match → friendly message, not a crash.
- `getChatMember`/`getChat`/`exportChatInviteLink` failures (bot not an
  admin in the target channel, chat not found) → caught and surfaced to the
  admin as a clear instruction ("Bot bu kanalda admin emas, iltimos botni
  kanalga admin qiling"), never a raw stack trace.
- A new video arriving while a `PendingUpload` is already waiting on title/
  number input starts a fresh pending flow for that admin, replacing the
  stale one.

## Deployment

- Runs as a plain NestJS app against local MySQL — no Docker, no Redis,
  consistent with the local-infra pattern used elsewhere.
- **Process manager: PM2** (`ecosystem.config.js`) runs the built
  `dist/main.js`, auto-restarts on crash, and captures stdout/stderr to log
  files. First deploy: `pm2 start ecosystem.config.js --name obuna-bot`;
  subsequent releases: `pm2 restart obuna-bot`.
- **Release flow:** `npm install` → `npx prisma generate` →
  `npx prisma migrate deploy` → `npm run build` → `pm2 restart obuna-bot`.
- **Config:** `.env` holds `BOT_TOKEN`, `ADMIN_IDS`, `DATABASE_URL`. `.env`
  is git-ignored and never committed; the bot token is not recorded in this
  document. `.gitignore` also covers `node_modules/`, `dist/`, and PM2 log
  files.
- **Backups:** a periodic `mysqldump` (e.g. daily cron) of the database is
  worth having — `Movie.fileId` entries depend on the admin's original
  uploads and aren't trivially re-creatable if the DB is lost, even though
  Telegram itself still hosts the actual video files.
- Prisma migrations manage schema; an optional seed script may insert the
  known channel above.

## Testing Approach

- Telegram flows are end-to-end tested manually against the real bot
  (mocking Telegraf updates has low value for this scope).
- Light unit tests for pure logic: subscription-check aggregation (all
  channels vs. any missing), and number-vs-title query parsing in
  `/search`.
