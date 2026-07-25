import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendSpendingBudgetCreateBody,
  type SpendingBudgetRequestBody,
  unauthorizedResponse,
} from "./spending-budget-bff";

export async function GET() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(`${getBackendUrl()}/spending-budget`, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to load spending budgets", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function POST(request: NextRequest) {
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

    const response = await fetch(`${getBackendUrl()}/spending-budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(toBackendSpendingBudgetCreateBody(body)),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to create spending budget", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
