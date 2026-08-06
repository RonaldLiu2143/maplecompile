import { NextResponse } from "next/server";

export const revalidate = 120;

/**
 * Latest message from a Discord announcement (GUILD_ANNOUNCEMENT / news) channel.
 *
 * Discord does not expose a public message feed for followable announcement channels
 * (guild widget is disabled on MapleStory; invite metadata has no message history).
 * Reading messages still requires a Discord app token with Read Message History on
 * that channel — same GET /channels/{id}/messages flow as any text channel.
 *
 * Three different Discord IDs — do not mix them up:
 * - Channel id (`DISCORD_ANNOUNCEMENT_CHANNEL_ID`): which channel to read
 *   (default `1274449819493990420`).
 * - Bot user / application id (`DISCORD_BOT_USER_ID` or `DISCORD_APPLICATION_ID`):
 *   public snowflake for OAuth2 invite URLs only
 *   (default `1466224186211958907`). Not a secret; not a token.
 * - Bot token (`DISCORD_TOKEN` / `DISCORD_BOT_TOKEN`): secret from Developer
 *   Portal → Bot → Reset Token. Required for Authorization: Bot …. Never put
 *   the bot user id here.
 *
 * Env:
 * - DISCORD_TOKEN (preferred) or DISCORD_BOT_TOKEN (alias): bot token (secret)
 * - DISCORD_ANNOUNCEMENT_CHANNEL_ID: announcement channel snowflake
 *   (default `1274449819493990420` — MapleStory announcement channel)
 * - DISCORD_BOT_USER_ID or DISCORD_APPLICATION_ID: bot/application snowflake
 *   for invite links (default `1466224186211958907`)
 * - DISCORD_GUILD_ID: optional server snowflake for message deep links
 *   (`discord.com/channels/{guild}/{channel}/{message}`). No default — do not
 *   reuse the channel id as the guild. Without a guild (env or message payload),
 *   links fall back to https://discord.gg/maplestory
 */
const DEFAULT_CHANNEL_ID = "1274449819493990420";
/** Public bot/application snowflake — not a token. */
const DEFAULT_BOT_USER_ID = "1466224186211958907";
/** Empty by default — never reuse the announcement channel id as the guild. */
const DEFAULT_GUILD_ID = "";
const MAPLESTORY_DISCORD_INVITE = "https://discord.gg/maplestory";
/** Read Message History — Discord permission bit 1 << 16. */
const PERM_READ_MESSAGE_HISTORY = 1 << 16;

function botInviteUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: String(PERM_READ_MESSAGE_HISTORY),
    scope: "bot",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

type DiscordEmbed = {
  title?: string;
  description?: string;
};

type DiscordMessage = {
  id: string;
  content?: string;
  timestamp?: string;
  guild_id?: string;
  author?: { username?: string; global_name?: string | null };
  embeds?: DiscordEmbed[];
};

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
  };
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function deriveAnnouncement(msg: DiscordMessage): {
  title: string | null;
  body: string;
} {
  const embed = msg.embeds?.find((e) => e.title?.trim() || e.description?.trim());
  const content = (msg.content ?? "").trim();
  const embedTitle = embed?.title?.trim() || null;
  const embedDesc = embed?.description?.trim() || "";

  if (embedTitle) {
    const body = content || embedDesc;
    return { title: truncate(embedTitle, 120), body: truncate(body, 280) };
  }

  if (content) {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const first = lines[0] ?? content;
    // Treat a short first line as a title when the message has more body.
    if (lines.length > 1 && first.length <= 100) {
      return {
        title: truncate(first, 120),
        body: truncate(lines.slice(1).join("\n"), 280),
      };
    }
    return { title: null, body: truncate(content, 280) };
  }

  if (embedDesc) {
    return { title: null, body: truncate(embedDesc, 280) };
  }

  return { title: null, body: "" };
}

export async function GET() {
  const token =
    process.env.DISCORD_TOKEN?.trim() ||
    process.env.DISCORD_BOT_TOKEN?.trim() ||
    "";
  const channelId =
    process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
  const botUserId =
    process.env.DISCORD_BOT_USER_ID?.trim() ||
    process.env.DISCORD_APPLICATION_ID?.trim() ||
    DEFAULT_BOT_USER_ID;
  const inviteUrl = botInviteUrl(botUserId);
  const guildIdFromEnv =
    process.env.DISCORD_GUILD_ID?.trim() || DEFAULT_GUILD_ID;

  if (!token) {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "no_token" as const,
        message: "Discord announcements unavailable",
        hint: "Set DISCORD_TOKEN (bot token from Developer Portal → Bot → Reset Token — not the bot user id). Invite the bot with Read Message History, then set the token in .env.local.",
        inviteUrl,
        botUserId,
      },
      { status: 200, headers: cacheHeaders() },
    );
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=1`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "MapleCompile (discord-announcements)",
        },
        next: { revalidate: 120 },
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false as const,
          reason: "discord_error" as const,
          message: "Discord announcements unavailable",
          status: res.status,
          detail: detail.slice(0, 200),
        },
        { status: 200, headers: cacheHeaders() },
      );
    }

    const messages = (await res.json()) as DiscordMessage[];
    const msg = messages[0];
    if (!msg?.id) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "empty" as const,
          message: "No announcements in that channel yet.",
        },
        { status: 200, headers: cacheHeaders() },
      );
    }

    const author =
      msg.author?.global_name?.trim() ||
      msg.author?.username?.trim() ||
      "MapleStory Discord";
    const { title, body } = deriveAnnouncement(msg);
    // Message deep links need guild+channel+message. Prefer API guild_id, then env.
    // Never invent a guild from the channel id; fall back to the public invite.
    const resolvedGuild = msg.guild_id?.trim() || guildIdFromEnv;
    const url = resolvedGuild
      ? `https://discord.com/channels/${resolvedGuild}/${channelId}/${msg.id}`
      : MAPLESTORY_DISCORD_INVITE;

    return NextResponse.json(
      {
        ok: true as const,
        message: {
          id: msg.id,
          author,
          title,
          content: body,
          fullContent: (msg.content ?? "").trim(),
          timestamp: msg.timestamp ?? null,
          url,
          channelId,
          guildId: resolvedGuild || null,
        },
      },
      { headers: cacheHeaders() },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "fetch_failed" as const,
        message: "Discord announcements unavailable",
      },
      { status: 200, headers: cacheHeaders() },
    );
  }
}
