import { NextResponse } from "next/server";

export const revalidate = 120;

const CHANNEL_ID = "309809230095843328";

type DiscordMessage = {
  id: string;
  content?: string;
  timestamp?: string;
  guild_id?: string;
  author?: { username?: string; global_name?: string | null };
};

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
  };
}

export async function GET() {
  const token =
    process.env.DISCORD_BOT_TOKEN?.trim() ||
    process.env.DISCORD_TOKEN?.trim() ||
    "";

  if (!token) {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "no_token" as const,
        message: "Connect Discord bot token",
      },
      { status: 200, headers: cacheHeaders() },
    );
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=1`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          "User-Agent": "MapleCompile (discord-latest)",
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
          message: "Could not load the latest Discord post.",
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
          message: "No posts in that channel yet.",
        },
        { status: 200, headers: cacheHeaders() },
      );
    }

    const author =
      msg.author?.global_name?.trim() ||
      msg.author?.username?.trim() ||
      "Discord";
    const content = (msg.content ?? "").trim();
    const preview =
      content.length > 280 ? `${content.slice(0, 277).trimEnd()}…` : content;
    const guildId = msg.guild_id?.trim() || "";
    const url = guildId
      ? `https://discord.com/channels/${guildId}/${CHANNEL_ID}/${msg.id}`
      : `https://discord.com/channels/@me/${CHANNEL_ID}/${msg.id}`;

    return NextResponse.json(
      {
        ok: true as const,
        message: {
          id: msg.id,
          author,
          content: preview,
          fullContent: content,
          timestamp: msg.timestamp ?? null,
          url,
          channelId: CHANNEL_ID,
        },
      },
      { headers: cacheHeaders() },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false as const,
        reason: "fetch_failed" as const,
        message: "Could not reach Discord right now.",
      },
      { status: 200, headers: cacheHeaders() },
    );
  }
}
