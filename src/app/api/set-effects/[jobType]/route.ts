import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prettyJson } from "@/lib/http-json";

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobType: string }> },
) {
  const { jobType } = await context.params;
  const file = path.join(process.cwd(), "data", "set-effects", `${jobType}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return prettyJson(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { error: `No set-effect data for ${jobType}. Run npm run seed.` },
      { status: 404 },
    );
  }
}
