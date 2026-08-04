import { NextResponse } from "next/server";
import { toMapleScouterUserStat } from "@/lib/scouter/to-user-stat";
import type { BuffState, LinkState } from "@/lib/scouter/buffs";
import type { ScouterInput } from "@/lib/scouter/types";
import { CHAR_TO_KMS_CLASS } from "@/lib/scouter/kms-class";

const CALC_DMG_URL = "https://api.maplescouter.com/api/calc/dmg";
const HEXA_ORDER_URL = "https://api.maplescouter.com/api/calc/hexa-order";

const MS_HEADERS = {
  "Content-Type": "application/json",
  Origin: "https://maplescouter.com",
  Referer: "https://maplescouter.com/",
  "User-Agent": "Mozilla/5.0 MapleCompile",
};

export type HexaOrderOptions = {
  /** Piece (true) vs Erda (false) efficiency ranking */
  sole: boolean;
  /** Start from current levels (true) vs reset (false) */
  start: boolean;
  /** "3" = general boss, "1" = Kaling (MapleScouter) */
  cycle: string;
  /** Mercedes combat variant; 1 = Without Surge + Full Chain */
  merType: number;
};

export async function POST(req: Request) {
  let body: {
    input: ScouterInput;
    buffs: BuffState;
    links: LinkState;
    hexa: number[];
    options?: Partial<HexaOrderOptions>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.input) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  const options: HexaOrderOptions = {
    sole: body.options?.sole ?? true,
    start: body.options?.start ?? true,
    cycle: body.options?.cycle ?? "3",
    merType: body.options?.merType ?? 1,
  };

  try {
    const userStat = toMapleScouterUserStat(body);
    const myClass = CHAR_TO_KMS_CLASS[body.input.charType] ?? "영웅";
    const myHexa = (userStat as { hexa?: Record<string, unknown> }).hexa ?? {};

    const dmgRes = await fetch(CALC_DMG_URL, {
      method: "POST",
      headers: MS_HEADERS,
      body: JSON.stringify({ userStat }),
    });
    if (!dmgRes.ok) {
      const text = await dmgRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `MapleScouter CALC_DMG failed (${dmgRes.status})`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const dmgJson = (await dmgRes.json()) as {
      calculatedData?: {
        specEfficiency?: Record<string, number>;
      };
    };
    const specEff = dmgJson.calculatedData?.specEfficiency;
    if (!specEff) {
      return NextResponse.json(
        { error: "MapleScouter returned no specEfficiency" },
        { status: 502 },
      );
    }

    const orderUrl = `${HEXA_ORDER_URL}?class=${encodeURIComponent(myClass)}`;
    const orderRes = await fetch(orderUrl, {
      method: "POST",
      headers: MS_HEADERS,
      body: JSON.stringify({
        myHexa,
        specEff,
        sole: options.sole,
        merType: options.merType,
        start: options.start,
        cycle: options.cycle,
        userStat,
        id: "",
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `MapleScouter hexa-order failed (${orderRes.status})`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const orderJson = (await orderRes.json()) as {
      class_hexa?: unknown[];
      patch?: string;
    };

    return NextResponse.json({
      className: myClass,
      class_hexa: orderJson.class_hexa ?? [],
      patch: orderJson.patch ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
