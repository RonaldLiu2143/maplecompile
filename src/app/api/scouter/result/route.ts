import { NextResponse } from "next/server";
import { fetchMapleScouterCalcDmg } from "@/lib/scouter/maple-dmg";
import type { BuffState, LinkState } from "@/lib/scouter/buffs";
import type { ScouterInput } from "@/lib/scouter/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      input: ScouterInput;
      buffs: BuffState;
      links: LinkState;
      hexa: number[];
      /** MapleScouter special.is30min — tied to Result 20/30 min toggle. Default false (20/KMS). */
      is30min?: boolean;
    };
    if (!body?.input) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const { calculatedData, calculatedHuntData } =
      await fetchMapleScouterCalcDmg({
        input: body.input,
        buffs: body.buffs,
        links: body.links,
        hexa: body.hexa,
        is30min: body.is30min,
      });

    return NextResponse.json({
      calculatedData,
      calculatedHuntData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("CALC_DMG failed") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
