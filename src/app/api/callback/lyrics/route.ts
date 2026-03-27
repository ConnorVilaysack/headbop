import { NextResponse } from "next/server";

/** KIE lyrics webhook — we poll for results; this just acknowledges delivery. */
export async function POST() {
  return NextResponse.json({ code: 200, msg: "received" });
}
