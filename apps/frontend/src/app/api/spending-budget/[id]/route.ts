import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendSpendingBudgetUpdateBody,
  type SpendingBudgetRequestBody,
  unauthorizedResponse,
} from "../spending-budget-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    let body: SpendingBudgetRequestBody;

    try {
      body = (await request.json()) as SpendingBudgetRequestBody;
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/spending-budget/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(toBackendSpendingBudgetUpdateBody(body)),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to update spending budget", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const response = await fetch(`${getBackendUrl()}/spending-budget/${id}`, {
      method: "DELETE",
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to delete spending budget", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
