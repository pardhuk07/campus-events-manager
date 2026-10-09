import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    system: "ACM Conflict-Aware Events & Expenses Manager",
    timestamp: new Date().toISOString(),
  });
}