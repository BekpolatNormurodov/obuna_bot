# Movie Subscription Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS Telegram bot that serves movies by number or title search, gated behind mandatory subscription to admin-managed channels, where admins upload/replace movies by forwarding a video to the bot (only Telegram's `file_id` is ever persisted).

**Architecture:** NestJS app (no HTTP server — bootstrapped via `NestFactory.createApplicationContext`) using `nestjs-telegraf` for all bot handlers, Prisma/MySQL for persistence, long-polling transport. Two pure-logic modules (subscription aggregation, search-query parsing) are unit tested; everything else is Telegram-API-dependent and is verified manually against the real bot, per the spec's testing approach.

**Tech Stack:** NestJS 10, `nestjs-telegraf` + `telegraf` v4, Prisma 5 + MySQL, Jest (for the two pure-logic modules only), PM2 for process management.

**Spec:** `docs/superpowers/specs/2026-07-19-movie-subscription-bot-design.md`

## Global Constraints

- All user-facing text (messages, buttons, errors) is in Uzbek (Latin script) — centralized in one `BOT_TEXTS` constants module (Task 3), no inline string literals in handlers.
- Only Telegram `file_id` is ever stored for a movie — never download or re-upload video bytes.
- Admins are a fixed list from `.env` (`ADMIN_IDS`), never stored in the database or editable from the bot.
- No Docker, no Redis — local MySQL + PM2 process management only.
- Known seed data: admins `7548669824` (`@mobiledoctor_fix`) and `2053690211` (`@MrDeveloper2827`); channel `AZARTNIK UZ`, `chatId -1002949185784` (added via the bot's own `/kanallar` flow post-deploy, not a DB seed — see Task 17).
- `.env` is git-ignored and never committed; `BOT_TOKEN` is never written into any committed file.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `nest-cli.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/main.ts`
- Create: `src/app.module.ts`

**Interfaces:**
- Produces: `AppModule` (empty `@Module({})` for now, extended in every later task and finalized in Task 17), `bootstrap()` entrypoint in `main.ts`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "obuna-bot",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "nestjs-telegraf": "^2.7.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "telegraf": "^4.16.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "prisma": "^5.0.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.1.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": false,
    "target": "ES2021",
    "outDir": "./dist",
    "baseUrl": "./",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

- [ ] **Step 3: Create `nest-cli.json`**

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: Create `.env.example`**

```
BOT_TOKEN=
ADMIN_IDS=7548669824,2053690211
DATABASE_URL="mysql://root:password@localhost:3306/obuna_bot"
```

- [ ] **Step 6: Create `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';

@Module({})
export class AppModule {}
```

- [ ] **Step 7: Create `src/main.ts`**

```ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
}
bootstrap();
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, no errors.

- [ ] **Step 9: Verify the project builds**

Run: `npm run build`
Expected: succeeds, `dist/main.js` created.

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json nest-cli.json .gitignore .env.example src/main.ts src/app.module.ts
git commit -m "chore: scaffold NestJS project"
```

---

### Task 2: Prisma Schema & Database Layer

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/prisma/prisma.service.ts`
- Create: `src/prisma/prisma.module.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env var (Task 1's `.env.example`).
- Produces: Prisma models `Movie`, `Channel`, `PendingUpload`, `PendingChannelAction`; enums `PendingStep` (`AWAITING_CHOICE`, `WAITING_TITLE`, `WAITING_EDIT_NUMBER`) and `ChannelActionStep` (`WAITING_ADD`, `WAITING_EDIT`); `PrismaService` (extends `PrismaClient`, connects/disconnects with the Nest lifecycle); `PrismaModule` (`@Global()`, exports `PrismaService`).

Note: the spec's `PendingUpload.step` only listed `WAITING_TITLE`/`WAITING_EDIT_NUMBER`, but the flow needs a third state for "video received, waiting for the admin to tap Yangi kino / Mavjudini almashtirish" — that's `AWAITING_CHOICE`, added here. Similarly `PendingChannelAction` is a new small table (not in the original spec's schema) needed to track the channel add/edit prompt the same way `PendingUpload` tracks the movie upload prompt, per the spec's decision to persist admin in-flight state in the DB rather than in memory.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Movie {
  id        Int      @id @default(autoincrement())
  title     String
  fileId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Channel {
  id        Int      @id @default(autoincrement())
  chatId    String   @unique
  username  String?
  title     String
  inviteUrl String?
  createdAt DateTime @default(now())
}

enum PendingStep {
  AWAITING_CHOICE
  WAITING_TITLE
  WAITING_EDIT_NUMBER
}

model PendingUpload {
  id            Int         @id @default(autoincrement())
  adminId       BigInt      @unique
  fileId        String
  caption       String?
  step          PendingStep
  targetMovieId Int?
  createdAt     DateTime    @default(now())
}

enum ChannelActionStep {
  WAITING_ADD
  WAITING_EDIT
}

model PendingChannelAction {
  id              Int               @id @default(autoincrement())
  adminId         BigInt            @unique
  step            ChannelActionStep
  targetChannelId Int?
  createdAt       DateTime          @default(now())
}
```

- [ ] **Step 2: Create `src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: Create `src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Copy `.env.example` to `.env` and fill in a real local MySQL URL**

Run: `cp .env.example .env` (then edit `DATABASE_URL` and `BOT_TOKEN` in `.env` — a real bot token can be requested from @BotFather; `.env` is git-ignored)

- [ ] **Step 5: Run the initial migration against local MySQL**

Run: `npx prisma migrate dev --name init`
Expected: migration succeeds, `Movie`, `Channel`, `PendingUpload`, `PendingChannelAction` tables exist in the local database.

- [ ] **Step 6: Verify the project still builds**

Run: `npm run build`
Expected: succeeds (Prisma client generated as part of `migrate dev`).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/prisma/prisma.service.ts src/prisma/prisma.module.ts .gitignore
git commit -m "feat: add Prisma schema and PrismaService"
```

---

### Task 3: Bot Copy Constants (Uzbek UI Text)

**Files:**
- Create: `src/common/bot-texts.ts`

**Interfaces:**
- Produces: `BOT_TEXTS` — a single frozen object with every user-facing string used across the rest of the plan. Later tasks import `{ BOT_TEXTS }` from `'../common/bot-texts'` and must not introduce their own inline copy.

- [ ] **Step 1: Create `src/common/bot-texts.ts`**

```ts
export const BOT_TEXTS = {
  welcome:
    "Assalomu alaykum! Kino raqamini yuboring yoki /search <nomi> orqali qidiring.",
  subscribeRequired: "Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
  stillNotSubscribed: "⚠️ Siz hali barcha kanallarga obuna bo'lmadingiz.",
  checkSubscriptionButton: '✅ Tekshirish',

  movieNotFound: '⚠️ Bunday kino topilmadi.',
  searchResultsHeader: 'Topilgan kinolar:',

  chooseSaveOrReplace: 'Bu videoni nima qilaman?',
  saveNewButton: '💾 Yangi kino',
  replaceExistingButton: '✏️ Mavjudini almashtirish',
  askTitle: 'Kino nomini kiriting:',
  askTitleWithSuggestion: (caption: string) =>
    `Kino nomini kiriting (yoki tavsiya etilgan nomni yuboring: "${caption}"):`,
  movieSaved: (id: number) => `✅ Saqlandi, raqami: ${id}`,
  askEditNumber: "Almashtirmoqchi bo'lgan kino raqamini kiriting:",
  editNumberNotFound: (id: number) => `⚠️ #${id} raqamli kino topilmadi.`,
  movieUpdated: (id: number) => `✅ #${id} yangilandi`,
  uploadCancelled: '❌ Bekor qilindi.',

  botNotAdminInChannel:
    '⚠️ Bot bu kanalda admin emas, iltimos botni kanalga admin qiling.',
  channelsListHeader: "Kanallar ro'yxati:",
  channelsListEmpty: "Hozircha kanallar qo'shilmagan.",
  addChannelButton: "➕ Qo'shish",
  editChannelButton: '✏️ Tahrirlash',
  deleteChannelButton: "🗑 O'chirish",
  confirmDeleteButton: "✅ Ha, o'chirish",
  cancelDeleteButton: "❌ Yo'q, bekor qilish",
  askChannelIdentifier:
    "Kanal @username yoki chat ID sini yuboring (masalan @azartnik_uz yoki -1002949185784):",
  channelSaved: (title: string) => `✅ "${title}" kanali saqlandi.`,
  channelDeleted: "✅ Kanal o'chirildi.",
  confirmDeleteChannel: (title: string) =>
    `"${title}" kanalini o'chirishni tasdiqlaysizmi?`,
  channelResolveError:
    "⚠️ Kanalni topib bo'lmadi. Kanal @username yoki ID to'g'riligini tekshiring.",
} as const;
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/common/bot-texts.ts
git commit -m "feat: add centralized Uzbek bot copy"
```

---

### Task 4: Admin Guard

**Files:**
- Create: `src/common/admin.guard.ts`

**Interfaces:**
- Consumes: `ADMIN_IDS` env var (comma-separated Telegram user IDs).
- Produces: `AdminGuard` (implements `CanActivate`) — applied via `@UseGuards(AdminGuard)` on Telegraf `@Update()` classes/methods that must be admin-only (Tasks 12, 13).

- [ ] **Step 1: Create `src/common/admin.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminIds: number[];

  constructor() {
    this.adminIds = (process.env.ADMIN_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number);
  }

  canActivate(context: ExecutionContext): boolean {
    const telegrafContext = TelegrafExecutionContext.create(context);
    const ctx = telegrafContext.getContext<Context>();
    const userId = ctx.from?.id;
    return typeof userId === 'number' && this.adminIds.includes(userId);
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/common/admin.guard.ts
git commit -m "feat: add AdminGuard for admin-only bot handlers"
```

---

### Task 5: Subscription Aggregation Logic

**Files:**
- Create: `src/subscription/subscription-check.ts`
- Test: `src/subscription/subscription-check.spec.ts`

**Interfaces:**
- Produces: `Membership` interface (`{ isMember: boolean }`), `getMissingChannels<T extends Membership>(items: T[]): T[]`, `isSubscribedToAll<T extends Membership>(items: T[]): boolean`. Consumed by `SubscriptionService` (Task 8).

- [ ] **Step 1: Write the failing test**

```ts
// src/subscription/subscription-check.spec.ts
import { getMissingChannels, isSubscribedToAll } from './subscription-check';

describe('subscription-check', () => {
  const azartnik = { chatId: '-1002949185784', title: 'AZARTNIK UZ', isMember: true };
  const other = { chatId: '-1009999999999', title: 'Boshqa kanal', isMember: false };

  it('returns an empty array when every channel is joined', () => {
    expect(getMissingChannels([azartnik])).toEqual([]);
  });

  it('returns only the channels that are not joined', () => {
    expect(getMissingChannels([azartnik, other])).toEqual([other]);
  });

  it('returns an empty array for an empty input', () => {
    expect(getMissingChannels([])).toEqual([]);
  });

  it('isSubscribedToAll is true only when nothing is missing', () => {
    expect(isSubscribedToAll([azartnik])).toBe(true);
    expect(isSubscribedToAll([azartnik, other])).toBe(false);
    expect(isSubscribedToAll([])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest subscription-check`
Expected: FAIL — `Cannot find module './subscription-check'`

- [ ] **Step 3: Write the implementation**

```ts
// src/subscription/subscription-check.ts
export interface Membership {
  isMember: boolean;
}

export function getMissingChannels<T extends Membership>(items: T[]): T[] {
  return items.filter((item) => !item.isMember);
}

export function isSubscribedToAll<T extends Membership>(items: T[]): boolean {
  return getMissingChannels(items).length === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest subscription-check`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/subscription/subscription-check.ts src/subscription/subscription-check.spec.ts
git commit -m "feat: add subscription aggregation logic with tests"
```

---

### Task 6: Search Query Parser

**Files:**
- Create: `src/movies/search-query.ts`
- Test: `src/movies/search-query.spec.ts`

**Interfaces:**
- Produces: `SearchQuery` type (`{ type: 'number'; value: number } | { type: 'title'; value: string }`), `parseSearchQuery(raw: string): SearchQuery | null`. Consumed by `TextRouterUpdate` (Task 14) and `MoviesUpdate` (Task 15).

- [ ] **Step 1: Write the failing test**

```ts
// src/movies/search-query.spec.ts
import { parseSearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it('parses a pure numeric string as a number query', () => {
    expect(parseSearchQuery('120')).toEqual({ type: 'number', value: 120 });
  });

  it('parses non-numeric text as a title query', () => {
    expect(parseSearchQuery('Sherlok Xolms')).toEqual({
      type: 'title',
      value: 'Sherlok Xolms',
    });
  });

  it('trims surrounding whitespace before deciding the type', () => {
    expect(parseSearchQuery('  42  ')).toEqual({ type: 'number', value: 42 });
  });

  it('returns null for an empty or whitespace-only query', () => {
    expect(parseSearchQuery('   ')).toBeNull();
    expect(parseSearchQuery('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest search-query`
Expected: FAIL — `Cannot find module './search-query'`

- [ ] **Step 3: Write the implementation**

```ts
// src/movies/search-query.ts
export type SearchQuery =
  | { type: 'number'; value: number }
  | { type: 'title'; value: string };

export function parseSearchQuery(raw: string): SearchQuery | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return { type: 'number', value: Number(trimmed) };
  }
  return { type: 'title', value: trimmed };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest search-query`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/movies/search-query.ts src/movies/search-query.spec.ts
git commit -m "feat: add search query parser with tests"
```

---

### Task 7: Channels Service

**Files:**
- Create: `src/channels/channels.service.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), `@InjectBot()` Telegraf bot instance (registered by `TelegrafModule` in Task 17).
- Produces: `ResolvedChannel` (`{ chatId: string; username: string | null; title: string; inviteUrl: string | null }`), `ChannelNotAdminError` (thrown when `exportChatInviteLink` fails), `ChannelsService` with `resolveChannel(identifier: string): Promise<ResolvedChannel>`, `findAll()`, `findById(id: number)`, `create(data: ResolvedChannel)`, `update(id: number, data: ResolvedChannel)`, `delete(id: number)`. Consumed by `SubscriptionService` (Task 8), `ChannelsUpdate` (Task 13), `TextRouterUpdate` (Task 14).

- [ ] **Step 1: Create `src/channels/channels.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

export interface ResolvedChannel {
  chatId: string;
  username: string | null;
  title: string;
  inviteUrl: string | null;
}

export class ChannelNotAdminError extends Error {}

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async resolveChannel(identifier: string): Promise<ResolvedChannel> {
    const chat = await this.bot.telegram.getChat(identifier);
    const username = 'username' in chat ? (chat.username ?? null) : null;
    const title = 'title' in chat ? chat.title : identifier;

    let inviteUrl: string | null = null;
    if (!username) {
      try {
        inviteUrl = await this.bot.telegram.exportChatInviteLink(chat.id);
      } catch {
        throw new ChannelNotAdminError();
      }
    }

    return { chatId: String(chat.id), username, title, inviteUrl };
  }

  findAll() {
    return this.prisma.channel.findMany({ orderBy: { id: 'asc' } });
  }

  findById(id: number) {
    return this.prisma.channel.findUnique({ where: { id } });
  }

  create(data: ResolvedChannel) {
    return this.prisma.channel.create({ data });
  }

  update(id: number, data: ResolvedChannel) {
    return this.prisma.channel.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.channel.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds. (`@InjectBot()` requires `TelegrafModule` to be registered — that happens in Task 17; a build-only check is sufficient here since Nest only validates the DI graph at runtime bootstrap, not at `tsc` build time.)

- [ ] **Step 3: Commit**

```bash
git add src/channels/channels.service.ts
git commit -m "feat: add ChannelsService with Telegram channel resolution"
```

---

### Task 8: Subscription Service & Gate UI

**Files:**
- Create: `src/subscription/subscription.service.ts`
- Create: `src/subscription/subscription-message.ts`
- Create: `src/bot/bot.update.ts`

**Interfaces:**
- Consumes: `ChannelsService.findAll()` (Task 7), `getMissingChannels` (Task 5), `BOT_TEXTS` (Task 3), `@InjectBot()` bot instance.
- Produces: `ChannelMembershipResult` (`{ chatId, title, username, inviteUrl, isMember }`), `SubscriptionService.getMissingChannelsForUser(userId: number): Promise<ChannelMembershipResult[]>`, `buildSubscriptionKeyboard(missing: ChannelMembershipResult[])`, `BotUpdate` (`@Start()` and `@Action('check_subscription')` handlers). Consumed by `TextRouterUpdate` (Task 14) and `MoviesUpdate` (Task 15).

- [ ] **Step 1: Create `src/subscription/subscription.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ChannelsService } from '../channels/channels.service';
import { getMissingChannels } from './subscription-check';

const JOINED_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

export interface ChannelMembershipResult {
  chatId: string;
  title: string;
  username: string | null;
  inviteUrl: string | null;
  isMember: boolean;
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly channelsService: ChannelsService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async getMissingChannelsForUser(userId: number): Promise<ChannelMembershipResult[]> {
    const channels = await this.channelsService.findAll();
    const memberships: ChannelMembershipResult[] = await Promise.all(
      channels.map(async (channel) => {
        try {
          const member = await this.bot.telegram.getChatMember(channel.chatId, userId);
          return {
            chatId: channel.chatId,
            title: channel.title,
            username: channel.username,
            inviteUrl: channel.inviteUrl,
            isMember: JOINED_STATUSES.has(member.status),
          };
        } catch {
          return {
            chatId: channel.chatId,
            title: channel.title,
            username: channel.username,
            inviteUrl: channel.inviteUrl,
            isMember: false,
          };
        }
      }),
    );
    return getMissingChannels(memberships);
  }
}
```

- [ ] **Step 2: Create `src/subscription/subscription-message.ts`**

```ts
import { Markup } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelMembershipResult } from './subscription.service';

export function buildSubscriptionKeyboard(missing: ChannelMembershipResult[]) {
  const rows = missing.map((channel) => [
    Markup.button.url(
      channel.title,
      channel.username
        ? `https://t.me/${channel.username}`
        : (channel.inviteUrl as string),
    ),
  ]);
  rows.push([Markup.button.callback(BOT_TEXTS.checkSubscriptionButton, 'check_subscription')]);
  return Markup.inlineKeyboard(rows);
}
```

- [ ] **Step 3: Create `src/bot/bot.update.ts`**

```ts
import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';

@Update()
export class BotUpdate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.sendGateOrWelcome(ctx, false);
  }

  @Action('check_subscription')
  async onCheckSubscription(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.sendGateOrWelcome(ctx, true);
  }

  private async sendGateOrWelcome(ctx: Context, isRecheck: boolean) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      const text = isRecheck ? BOT_TEXTS.stillNotSubscribed : BOT_TEXTS.subscribeRequired;
      await ctx.reply(text, buildSubscriptionKeyboard(missing));
      return;
    }
    await ctx.reply(BOT_TEXTS.welcome);
  }
}
```

- [ ] **Step 4: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/subscription/subscription.service.ts src/subscription/subscription-message.ts src/bot/bot.update.ts
git commit -m "feat: add subscription service and /start gate UI"
```

---

### Task 9: Movies Service

**Files:**
- Create: `src/movies/movies.service.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2).
- Produces: `MoviesService` with `findById(id: number)`, `searchByTitle(title: string)`, `create(data: { title: string; fileId: string })`, `updateFileId(id: number, fileId: string)`. Consumed by `TextRouterUpdate` (Task 14), `MoviesUpdate` (Task 15).

- [ ] **Step 1: Create `src/movies/movies.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.movie.findUnique({ where: { id } });
  }

  searchByTitle(title: string) {
    return this.prisma.movie.findMany({
      where: { title: { contains: title } },
      orderBy: { id: 'asc' },
      take: 20,
    });
  }

  create(data: { title: string; fileId: string }) {
    return this.prisma.movie.create({ data });
  }

  updateFileId(id: number, fileId: string) {
    return this.prisma.movie.update({ where: { id }, data: { fileId } });
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/movies/movies.service.ts
git commit -m "feat: add MoviesService"
```

---

### Task 10: Pending Upload Service

**Files:**
- Create: `src/movies/pending-upload.service.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), `PendingStep` enum (Task 2, from `@prisma/client`).
- Produces: `PendingUploadService` with `startUpload(adminId: number, fileId: string, caption: string | null)`, `get(adminId: number)`, `setWaitingTitle(adminId: number)`, `setWaitingEditNumber(adminId: number)`, `clear(adminId: number)`. Consumed by `UploadUpdate` (Task 12), `TextRouterUpdate` (Task 14).

- [ ] **Step 1: Create `src/movies/pending-upload.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PendingStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingUploadService {
  constructor(private readonly prisma: PrismaService) {}

  startUpload(adminId: number, fileId: string, caption: string | null) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingUpload.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, fileId, caption, step: PendingStep.AWAITING_CHOICE },
      update: { fileId, caption, step: PendingStep.AWAITING_CHOICE, targetMovieId: null },
    });
  }

  get(adminId: number) {
    return this.prisma.pendingUpload.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  setWaitingTitle(adminId: number) {
    return this.prisma.pendingUpload.update({
      where: { adminId: BigInt(adminId) },
      data: { step: PendingStep.WAITING_TITLE },
    });
  }

  setWaitingEditNumber(adminId: number) {
    return this.prisma.pendingUpload.update({
      where: { adminId: BigInt(adminId) },
      data: { step: PendingStep.WAITING_EDIT_NUMBER },
    });
  }

  clear(adminId: number) {
    return this.prisma.pendingUpload.deleteMany({ where: { adminId: BigInt(adminId) } });
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/movies/pending-upload.service.ts
git commit -m "feat: add PendingUploadService for the movie upload state machine"
```

---

### Task 11: Pending Channel Action Service

**Files:**
- Create: `src/channels/pending-channel-action.service.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), `ChannelActionStep` enum (Task 2, from `@prisma/client`).
- Produces: `PendingChannelActionService` with `startAdd(adminId: number)`, `startEdit(adminId: number, targetChannelId: number)`, `get(adminId: number)`, `clear(adminId: number)`. Consumed by `ChannelsUpdate` (Task 13), `TextRouterUpdate` (Task 14), `UploadUpdate`'s `/cancel` (Task 12).

- [ ] **Step 1: Create `src/channels/pending-channel-action.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ChannelActionStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingChannelActionService {
  constructor(private readonly prisma: PrismaService) {}

  startAdd(adminId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, step: ChannelActionStep.WAITING_ADD },
      update: { step: ChannelActionStep.WAITING_ADD, targetChannelId: null },
    });
  }

  startEdit(adminId: number, targetChannelId: number) {
    const adminIdBig = BigInt(adminId);
    return this.prisma.pendingChannelAction.upsert({
      where: { adminId: adminIdBig },
      create: { adminId: adminIdBig, step: ChannelActionStep.WAITING_EDIT, targetChannelId },
      update: { step: ChannelActionStep.WAITING_EDIT, targetChannelId },
    });
  }

  get(adminId: number) {
    return this.prisma.pendingChannelAction.findUnique({ where: { adminId: BigInt(adminId) } });
  }

  clear(adminId: number) {
    return this.prisma.pendingChannelAction.deleteMany({ where: { adminId: BigInt(adminId) } });
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/channels/pending-channel-action.service.ts
git commit -m "feat: add PendingChannelActionService for the channel add/edit state machine"
```

---

### Task 12: Admin Video Upload Handler

**Files:**
- Create: `src/movies/upload.update.ts`

**Interfaces:**
- Consumes: `AdminGuard` (Task 4), `BOT_TEXTS` (Task 3), `PendingUploadService` (Task 10), `PendingChannelActionService` (Task 11).
- Produces: `UploadUpdate` — `@On('video')`, `@Action('save_new')`, `@Action('save_replace')`, `@Command('cancel')`. The `save_new`/`save_replace` callback data strings are load-bearing: `TextRouterUpdate` (Task 14) checks `PendingUpload.step` values set here (`WAITING_TITLE`/`WAITING_EDIT_NUMBER`) to know how to interpret the admin's next text message.

- [ ] **Step 1: Create `src/movies/upload.update.ts`**

```ts
import { Action, Command, Ctx, On, Update, UseGuards } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { AdminGuard } from '../common/admin.guard';
import { BOT_TEXTS } from '../common/bot-texts';
import { PendingChannelActionService } from '../channels/pending-channel-action.service';
import { PendingUploadService } from './pending-upload.service';

@Update()
@UseGuards(AdminGuard)
export class UploadUpdate {
  constructor(
    private readonly pendingUploadService: PendingUploadService,
    private readonly pendingChannelActionService: PendingChannelActionService,
  ) {}

  @On('video')
  async onVideo(@Ctx() ctx: Context) {
    const message = ctx.message as Message.VideoMessage;
    const fileId = message.video.file_id;
    const caption = message.caption ?? null;
    await this.pendingUploadService.startUpload(ctx.from!.id, fileId, caption);
    await ctx.reply(BOT_TEXTS.chooseSaveOrReplace, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.saveNewButton, callback_data: 'save_new' },
            { text: BOT_TEXTS.replaceExistingButton, callback_data: 'save_replace' },
          ],
        ],
      },
    });
  }

  @Action('save_new')
  async onChooseSaveNew(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    await this.pendingUploadService.setWaitingTitle(userId);
    const pending = await this.pendingUploadService.get(userId);
    const text = pending?.caption
      ? BOT_TEXTS.askTitleWithSuggestion(pending.caption)
      : BOT_TEXTS.askTitle;
    await ctx.reply(text);
  }

  @Action('save_replace')
  async onChooseReplace(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.pendingUploadService.setWaitingEditNumber(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.askEditNumber);
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Context) {
    const userId = ctx.from!.id;
    await this.pendingUploadService.clear(userId);
    await this.pendingChannelActionService.clear(userId);
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/movies/upload.update.ts
git commit -m "feat: add admin video upload handler with save/replace choice"
```

---

### Task 13: Channel Management Handlers (`/kanallar`)

**Files:**
- Create: `src/channels/channels.update.ts`

**Interfaces:**
- Consumes: `AdminGuard` (Task 4), `BOT_TEXTS` (Task 3), `ChannelsService` (Task 7), `PendingChannelActionService` (Task 11).
- Produces: `ChannelsUpdate` — `@Command('kanallar')`, `@Action('channel_add')`, `@Action(/^channel_view:(\d+)$/)`, `@Action(/^channel_edit:(\d+)$/)`, `@Action(/^channel_delete_ask:(\d+)$/)`, `@Action(/^channel_delete:(\d+)$/)`, `@Action('channel_delete_cancel')`. The `channel_*` callback data prefixes are load-bearing — do not rename without updating every `@Action` pattern above.

- [ ] **Step 1: Create `src/channels/channels.update.ts`**

```ts
import { Action, Command, Ctx, Update, UseGuards } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminGuard } from '../common/admin.guard';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelsService } from './channels.service';
import { PendingChannelActionService } from './pending-channel-action.service';

type MatchContext = Context & { match: RegExpExecArray };

@Update()
@UseGuards(AdminGuard)
export class ChannelsUpdate {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly pendingChannelActionService: PendingChannelActionService,
  ) {}

  @Command('kanallar')
  async list(@Ctx() ctx: Context) {
    await this.sendChannelList(ctx);
  }

  private async sendChannelList(ctx: Context) {
    const channels = await this.channelsService.findAll();
    const rows = channels.map((channel) => [
      { text: channel.title, callback_data: `channel_view:${channel.id}` },
    ]);
    rows.push([{ text: BOT_TEXTS.addChannelButton, callback_data: 'channel_add' }]);
    const text = channels.length ? BOT_TEXTS.channelsListHeader : BOT_TEXTS.channelsListEmpty;
    await ctx.reply(text, { reply_markup: { inline_keyboard: rows } });
  }

  @Action('channel_add')
  async onAdd(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.pendingChannelActionService.startAdd(ctx.from!.id);
    await ctx.reply(BOT_TEXTS.askChannelIdentifier);
  }

  @Action(/^channel_view:(\d+)$/)
  async onView(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const channel = await this.channelsService.findById(id);
    if (!channel) return;
    await ctx.reply(channel.title, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.editChannelButton, callback_data: `channel_edit:${id}` },
            { text: BOT_TEXTS.deleteChannelButton, callback_data: `channel_delete_ask:${id}` },
          ],
        ],
      },
    });
  }

  @Action(/^channel_edit:(\d+)$/)
  async onEdit(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    await this.pendingChannelActionService.startEdit(ctx.from!.id, id);
    await ctx.reply(BOT_TEXTS.askChannelIdentifier);
  }

  @Action(/^channel_delete_ask:(\d+)$/)
  async onDeleteAsk(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const channel = await this.channelsService.findById(id);
    if (!channel) return;
    await ctx.reply(BOT_TEXTS.confirmDeleteChannel(channel.title), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: BOT_TEXTS.confirmDeleteButton, callback_data: `channel_delete:${id}` },
            { text: BOT_TEXTS.cancelDeleteButton, callback_data: 'channel_delete_cancel' },
          ],
        ],
      },
    });
  }

  @Action(/^channel_delete:(\d+)$/)
  async onDelete(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    await this.channelsService.delete(id);
    await ctx.reply(BOT_TEXTS.channelDeleted);
  }

  @Action('channel_delete_cancel')
  async onDeleteCancel(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(BOT_TEXTS.uploadCancelled);
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/channels/channels.update.ts
git commit -m "feat: add /kanallar channel management handlers"
```

---

### Task 14: Consolidated Text Router

**Files:**
- Create: `src/bot/text-router.update.ts`

**Interfaces:**
- Consumes: `BOT_TEXTS` (Task 3), `PendingUploadService` (Task 10), `PendingChannelActionService` (Task 11), `ChannelsService.resolveChannel`/`ChannelNotAdminError` (Task 7), `MoviesService` (Task 9), `SubscriptionService.getMissingChannelsForUser` (Task 8), `buildSubscriptionKeyboard` (Task 8), `parseSearchQuery` (Task 6).
- Produces: `TextRouterUpdate` — the single `@On('text')` handler for the whole bot. Routing priority per message: (1) if sender is an admin with a `PendingUpload` row → interpret as title or edit-number input; (2) else if sender is an admin with a `PendingChannelAction` row → interpret as a channel identifier; (3) else if the text is a bare number → treat as a movie lookup; (4) else ignore. This is the only place plain (non-command) text is handled — no other `@On('text')` handler should be added elsewhere, to avoid ambiguous double-handling by Telegraf.

- [ ] **Step 1: Create `src/bot/text-router.update.ts`**

```ts
import { Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/types';
import { BOT_TEXTS } from '../common/bot-texts';
import { ChannelNotAdminError, ChannelsService } from '../channels/channels.service';
import { PendingChannelActionService } from '../channels/pending-channel-action.service';
import { MoviesService } from '../movies/movies.service';
import { PendingUploadService } from '../movies/pending-upload.service';
import { parseSearchQuery } from '../movies/search-query';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';

function getAdminIds(): number[] {
  return (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number);
}

@Update()
export class TextRouterUpdate {
  constructor(
    private readonly pendingUploadService: PendingUploadService,
    private readonly pendingChannelActionService: PendingChannelActionService,
    private readonly channelsService: ChannelsService,
    private readonly moviesService: MoviesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    const text = (ctx.message as Message.TextMessage).text.trim();
    if (!userId || !text || text.startsWith('/')) return;

    if (getAdminIds().includes(userId)) {
      if (await this.handlePendingUpload(ctx, userId, text)) return;
      if (await this.handlePendingChannelAction(ctx, userId, text)) return;
    }

    await this.handleMovieLookup(ctx, userId, text);
  }

  private async handlePendingUpload(ctx: Context, userId: number, text: string) {
    const pending = await this.pendingUploadService.get(userId);
    if (!pending) return false;

    if (pending.step === 'WAITING_TITLE') {
      const movie = await this.moviesService.create({ title: text, fileId: pending.fileId });
      await this.pendingUploadService.clear(userId);
      await ctx.reply(BOT_TEXTS.movieSaved(movie.id));
      return true;
    }

    if (pending.step === 'WAITING_EDIT_NUMBER') {
      const id = Number(text);
      const movie = Number.isInteger(id) ? await this.moviesService.findById(id) : null;
      if (!movie) {
        await ctx.reply(BOT_TEXTS.editNumberNotFound(id));
        return true;
      }
      await this.moviesService.updateFileId(id, pending.fileId);
      await this.pendingUploadService.clear(userId);
      await ctx.reply(BOT_TEXTS.movieUpdated(id));
      return true;
    }

    return false;
  }

  private async handlePendingChannelAction(ctx: Context, userId: number, text: string) {
    const pending = await this.pendingChannelActionService.get(userId);
    if (!pending) return false;

    try {
      const resolved = await this.channelsService.resolveChannel(text);
      if (pending.step === 'WAITING_ADD') {
        await this.channelsService.create(resolved);
      } else {
        await this.channelsService.update(pending.targetChannelId as number, resolved);
      }
      await this.pendingChannelActionService.clear(userId);
      await ctx.reply(BOT_TEXTS.channelSaved(resolved.title));
    } catch (error) {
      if (error instanceof ChannelNotAdminError) {
        await ctx.reply(BOT_TEXTS.botNotAdminInChannel);
      } else {
        await ctx.reply(BOT_TEXTS.channelResolveError);
      }
    }
    return true;
  }

  private async handleMovieLookup(ctx: Context, userId: number, text: string) {
    const query = parseSearchQuery(text);
    if (!query || query.type !== 'number') return;

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const movie = await this.moviesService.findById(query.value);
    if (!movie) {
      await ctx.reply(BOT_TEXTS.movieNotFound);
      return;
    }
    await ctx.replyWithVideo(movie.fileId);
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/bot/text-router.update.ts
git commit -m "feat: add consolidated text router for pending flows and movie lookup"
```

---

### Task 15: Search Command Handler

**Files:**
- Create: `src/movies/movies.update.ts`

**Interfaces:**
- Consumes: `BOT_TEXTS` (Task 3), `MoviesService` (Task 9), `SubscriptionService.getMissingChannelsForUser` (Task 8), `buildSubscriptionKeyboard` (Task 8), `parseSearchQuery` (Task 6).
- Produces: `MoviesUpdate` — `@Command('search')`, `@Action(/^movie_get:(\d+)$/)`.

- [ ] **Step 1: Create `src/movies/movies.update.ts`**

```ts
import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BOT_TEXTS } from '../common/bot-texts';
import { buildSubscriptionKeyboard } from '../subscription/subscription-message';
import { SubscriptionService } from '../subscription/subscription.service';
import { MoviesService } from './movies.service';
import { parseSearchQuery } from './search-query';

type MatchContext = Context & { match: RegExpExecArray };

@Update()
export class MoviesUpdate {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Command('search')
  async onSearch(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const missing = await this.subscriptionService.getMissingChannelsForUser(userId);
    if (missing.length > 0) {
      await ctx.reply(BOT_TEXTS.subscribeRequired, buildSubscriptionKeyboard(missing));
      return;
    }

    const messageText = (ctx.message as { text: string }).text;
    const raw = messageText.replace(/^\/search(@\w+)?\s*/, '');
    const query = parseSearchQuery(raw);
    if (!query) {
      await ctx.reply(BOT_TEXTS.movieNotFound);
      return;
    }

    if (query.type === 'number') {
      const movie = await this.moviesService.findById(query.value);
      if (!movie) {
        await ctx.reply(BOT_TEXTS.movieNotFound);
        return;
      }
      await ctx.replyWithVideo(movie.fileId);
      return;
    }

    const movies = await this.moviesService.searchByTitle(query.value);
    if (movies.length === 0) {
      await ctx.reply(BOT_TEXTS.movieNotFound);
      return;
    }
    const rows = movies.map((movie) => [
      { text: `#${movie.id} — ${movie.title}`, callback_data: `movie_get:${movie.id}` },
    ]);
    await ctx.reply(BOT_TEXTS.searchResultsHeader, { reply_markup: { inline_keyboard: rows } });
  }

  @Action(/^movie_get:(\d+)$/)
  async onGetFromSearch(@Ctx() ctx: MatchContext) {
    await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const movie = await this.moviesService.findById(id);
    if (!movie) {
      await ctx.reply(BOT_TEXTS.movieNotFound);
      return;
    }
    await ctx.replyWithVideo(movie.fileId);
  }
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/movies/movies.update.ts
git commit -m "feat: add /search command handler"
```

---

### Task 16: Bootstrap, Module Wiring, PM2 & Docs

**Files:**
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`
- Create: `ecosystem.config.js`
- Create: `README.md`

**Interfaces:**
- Consumes: every provider/Update class from Tasks 2–15.
- Produces: a fully wired, runnable `AppModule`; a PM2 process definition; operator-facing setup docs.

- [ ] **Step 1: Replace `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { AdminGuard } from './common/admin.guard';
import { BotUpdate } from './bot/bot.update';
import { TextRouterUpdate } from './bot/text-router.update';
import { ChannelsService } from './channels/channels.service';
import { ChannelsUpdate } from './channels/channels.update';
import { PendingChannelActionService } from './channels/pending-channel-action.service';
import { MoviesService } from './movies/movies.service';
import { MoviesUpdate } from './movies/movies.update';
import { PendingUploadService } from './movies/pending-upload.service';
import { UploadUpdate } from './movies/upload.update';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionService } from './subscription/subscription.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TelegrafModule.forRoot({ token: process.env.BOT_TOKEN as string }),
  ],
  providers: [
    AdminGuard,
    ChannelsService,
    PendingChannelActionService,
    MoviesService,
    PendingUploadService,
    SubscriptionService,
    BotUpdate,
    TextRouterUpdate,
    ChannelsUpdate,
    MoviesUpdate,
    UploadUpdate,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Verify `src/main.ts` already loads env before `AppModule`**

`src/main.ts` from Task 1 already starts with `import 'dotenv/config';` before importing `AppModule` — this must run first so `process.env.BOT_TOKEN` is populated by the time `TelegrafModule.forRoot(...)` reads it. No change needed; just confirm the file still reads:

```ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
}
bootstrap();
```

- [ ] **Step 3: Create `ecosystem.config.js`**

```js
module.exports = {
  apps: [
    {
      name: 'obuna-bot',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Obuna Bot

Kino obuna Telegram bot — NestJS + nestjs-telegraf + Prisma/MySQL. Kino
videolar serverga yuklanmaydi — faqat Telegram `file_id` bazada saqlanadi.

## Lokal ishga tushirish

1. `cp .env.example .env` va `BOT_TOKEN`, `DATABASE_URL` ni to'ldiring.
2. `npm install`
3. `npx prisma migrate dev --name init`
4. `npm run start:dev`

## Production (PM2)

\`\`\`bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js --name obuna-bot
\`\`\`

Keyingi relizlarda: `pm2 restart obuna-bot`.

## Boshlang'ich sozlash

Bot birinchi marta ishga tushgach, admin akkountdan (`.env` dagi
`ADMIN_IDS`) botga `/kanallar` yuboring, so'ng **➕ Qo'shish** tugmasini
bosib quyidagi kanalni qo'shing:

- `-1002949185784` (AZARTNIK UZ)

Bot bu kanalda **admin** bo'lishi shart — aks holda taklif havolasini
(`invite link`) ololmaydi va "Bot bu kanalda admin emas" xabarini
qaytaradi.

## Zaxira nusxa (backup)

`Movie.fileId` yozuvlari qayta tiklab bo'lmaydigan ma'lumot — admin
yuklagan original videoning o'rnini bosuvchi manba yo'q. Production
serverida davriy `mysqldump` (masalan kunlik cron) sozlash tavsiya
etiladi.
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all 8 tests from Tasks 5 and 6 green, no other suites.

- [ ] **Step 6: Verify the project builds end-to-end**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Manual verification against the real bot**

With a valid `BOT_TOKEN` in `.env` and local MySQL running:

Run: `npm run start:dev`

Then, from a non-admin Telegram account:
1. Send `/start` → expect the subscription-gate message (no channels added yet, so the gate is empty and it should fall straight to the welcome text — add a test channel via an admin account first to see the gate message).
2. After joining, send `/start` again → expect `BOT_TEXTS.welcome`.

From an admin account (`ADMIN_IDS`):
1. Send `/kanallar` → expect `BOT_TEXTS.channelsListEmpty` + **➕ Qo'shish** button.
2. Tap **➕ Qo'shish**, send `-1002949185784` → expect either `BOT_TEXTS.channelSaved('AZARTNIK UZ')` or, if the bot isn't yet an admin there, `BOT_TEXTS.botNotAdminInChannel`.
3. Forward any video to the bot → expect `BOT_TEXTS.chooseSaveOrReplace` with the two buttons.
4. Tap **💾 Yangi kino**, send a title → expect `BOT_TEXTS.movieSaved(id)`.
5. From any subscribed account, send that `id` as a bare number → expect the video to be returned.
6. Send `/search <part of the title>` → expect a button list; tapping one returns the video.

- [ ] **Step 8: Commit**

```bash
git add src/app.module.ts ecosystem.config.js README.md
git commit -m "feat: wire AppModule, add PM2 config and setup docs"
```

---

## Self-Review Notes

- **Spec coverage:** force-subscription gate (Tasks 5, 8), admin-managed channels with auto-resolved title/invite link (Tasks 7, 13), admin video upload → save-new/replace-existing via inline buttons with DB-persisted state (Tasks 10–12, 14), number/search movie retrieval (Tasks 6, 9, 14, 15), Uzbek-only copy (Task 3), file_id-only storage (Tasks 2, 9, 12), PM2 deployment + backup note (Task 16) — all covered.
- **Schema deviation from spec:** `PendingStep` gained a third value (`AWAITING_CHOICE`) and a new `PendingChannelAction` table was added beyond the spec's literal schema — both are documented inline in Task 2 as necessary consequences of the state-machine approach the spec approved, not scope creep.
- **Seed script dropped:** the spec allowed an "optional" DB seed for the known channel, but seeding it directly would produce a channel with no `username`/`inviteUrl`, breaking its subscription button. Task 16 instead documents using the bot's own `/kanallar` → `➕ Qo'shish` flow post-deploy, which correctly resolves the invite link via the Telegram API.
- **Type consistency checked:** `PendingUploadService`/`PendingChannelActionService` method names and signatures match their call sites in `UploadUpdate`, `ChannelsUpdate`, and `TextRouterUpdate`; `BOT_TEXTS` keys used across Tasks 8, 12, 13, 14, 15 all exist in the Task 3 definition; `ChannelsService.resolveChannel`'s `ResolvedChannel` shape matches `channelsService.create`/`update` call sites in Task 14.
