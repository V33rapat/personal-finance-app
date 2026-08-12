import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendSpendingPlanPreferencesBody,
  type SpendingPlanRequestBody,
  unauthorizedResponse,
} from "../../spending-plan-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const response = await fetch(
      `${getBackendUrl()}/spending-plan/${id}/preferences`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(toBackendSpendingPlanPreferencesBody(body)),
        cache: "no-store",
      },
    );
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(
        data,
        "Failed to update spending plan preferences",
        response.status,
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
