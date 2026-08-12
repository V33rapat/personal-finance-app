import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  type SpendingPlanRequestBody,
  unauthorizedResponse,
} from "../../spending-plan-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    let body: SpendingPlanRequestBody;

    try {
      body = (await request.json()) as SpendingPlanRequestBody;
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/spending-plan/${id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        name: typeof body.name === "string" ? body.name.trim() : body.name,
        start_date: body.startDate ?? body.start_date,
        end_date: body.endDate ?? body.end_date,
      }),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to copy spending plan", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
