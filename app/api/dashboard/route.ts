import { requireRole } from "@/lib/auth/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { fetchDashboardData } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { authorized, response } = await requireRole();
    if (!authorized) return response;

    const data = await fetchDashboardData();
    return successResponse(data);
  } catch (err) {
    console.error("[Dashboard API Error]", err);
    return errorResponse("INTERNAL_ERROR", "Failed to load dashboard data", 500);
  }
}
