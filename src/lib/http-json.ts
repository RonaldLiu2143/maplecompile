import { NextResponse } from "next/server";

/** Pretty-printed JSON for catalog/debug responses (gzip still applies on the wire). */
export function prettyJson(data: unknown, init?: { status?: number }) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
