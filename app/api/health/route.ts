import { NextResponse } from "next/server";
import { ensureDatabaseTables } from "@/lib/initDb";

export async function GET() {
  try {
    await ensureDatabaseTables();
    return NextResponse.json({
      status: "online",
      database: "connected",
      system: "ACM Conflict-Aware Events & Expenses Manager (Official Hackathon Spec)",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Database initialization check error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}