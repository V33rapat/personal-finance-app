import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../../spending-plan-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/spending-plan/${id}/cancel`, {
      method: "POST",
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to cancel spending plan", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
