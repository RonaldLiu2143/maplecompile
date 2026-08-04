import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { enrichEquipsResponse } from "@/lib/equip-catalog";
import type { EquipsResponse } from "@/lib/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobType: string; charType: string }> },
) {
  const { jobType, charType } = await context.params;
  const file = path.join(
    process.cwd(),
    "data",
    "equips",
    jobType,
    `${charType}.json`,
  );
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as EquipsResponse;
    return NextResponse.json(enrichEquipsResponse(data, jobType));
  } catch {
    return NextResponse.json(
      { error: `No equip data for ${jobType}/${charType}. Run npm run seed.` },
      { status: 404 },
    );
  }
}
