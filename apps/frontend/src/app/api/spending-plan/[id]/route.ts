import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendSpendingPlanUpdateBody,
  type SpendingPlanRequestBody,
  unauthorizedResponse,
} from "../spending-plan-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const backendUrl = new URL(`${getBackendUrl()}/spending-plan/${id}`);
    const month = request.nextUrl.searchParams.get("month");

    if (month) {
      backendUrl.searchParams.set("month", month);
    }

    const response = await fetch(backendUrl, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to load spending plan", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
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
    const response = await fetch(`${getBackendUrl()}/spending-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(toBackendSpendingPlanUpdateBody(body)),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to update spending plan", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
