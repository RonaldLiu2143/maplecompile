import { NextResponse } from "next/server";
import { toMapleScouterUserStat } from "@/lib/scouter/to-user-stat";
import type { BuffState, LinkState } from "@/lib/scouter/buffs";
import type { ScouterInput } from "@/lib/scouter/types";

const CALC_DMG_URL = "https://api.maplescouter.com/api/calc/dmg";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      input: ScouterInput;
      buffs: BuffState;
      links: LinkState;
      hexa: number[];
    };
    if (!body?.input) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const userStat = toMapleScouterUserStat(body);
    const upstream = await fetch(CALC_DMG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://maplescouter.com",
        Referer: "https://maplescouter.com/",
        "User-Agent": "Mozilla/5.0 MapleCompile",
      },
      body: JSON.stringify({ userStat }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: `MapleScouter CALC_DMG failed (${upstream.status})`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as {
      calculatedData?: Record<string, unknown>;
      calculatedHuntData?: Record<string, unknown>;
    };

    return NextResponse.json({
      calculatedData: data.calculatedData ?? null,
      calculatedHuntData: data.calculatedHuntData ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
