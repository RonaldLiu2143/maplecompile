import { NextResponse } from "next/server";
import { buildLocalHexaEfficiencyOrder } from "@/lib/hexa-efficiency-order";
import {
  DEFAULT_BOSS_CONVERTED_STAT,
  normalizeBossConvertedStat,
} from "@/lib/hexa-priority";
import { calculateScouter } from "@/lib/scouter/calc";
import type { ScouterInput } from "@/lib/scouter/types";

/**
 * Local Hexa Efficiency order (MapleHub FD bands).
 * Kept as a POST endpoint for parity with the old MapleScouter proxy; the
 * Scouter UI computes the same path client-side.
 */
export async function POST(req: Request) {
  let body: {
    input: ScouterInput;
    hexa: number[];
    options?: {
      start?: boolean;
      bossConvertedStat?: number;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.input) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  try {
    let bossConvertedStat = normalizeBossConvertedStat(
      body.options?.bossConvertedStat ?? DEFAULT_BOSS_CONVERTED_STAT,
    );
    if (body.options?.bossConvertedStat == null) {
      try {
        const calc = calculateScouter(body.input);
        const raw = Math.round(Number(calc.boss380Stat) || 0);
        if (raw > 0) bossConvertedStat = normalizeBossConvertedStat(raw);
      } catch {
        /* keep default */
      }
    }

    const result = buildLocalHexaEfficiencyOrder({
      charType: body.input.charType,
      levels: Array.isArray(body.hexa) ? body.hexa : [],
      bossConvertedStat,
      fromCurrent: body.options?.start ?? true,
      includeHexaStat: true,
    });

    return NextResponse.json({
      className: result.classId,
      class_hexa: result.steps,
      patch: `band ${result.bandTarget}`,
      bossConvertedStat: result.bossConvertedStat,
      bandTarget: result.bandTarget,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hexa order failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
