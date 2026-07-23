import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../../_lib/bff";

interface DashboardPreferencesBody {
  period_start?: unknown;
  period_end?: unknown;
  is_category_breakdown_enabled?: unknown;
  hidden_category_ids?: unknown;
}

function backendErrorResponse(data: { message?: string } | null, fallback: string, status: number) {
  return NextResponse.json({ message: data?.message ?? fallback }, { status });
}

export async function GET() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(`${getBackendUrl()}/dashboard/preferences`, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(
        data,
        "Failed to load dashboard preferences",
        response.status
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    let body: DashboardPreferencesBody;

    try {
      body = (await request.json()) as DashboardPreferencesBody;
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const payload = {
      period_start: body.period_start,
      period_end: body.period_end,
      is_category_breakdown_enabled: body.is_category_breakdown_enabled,
      hidden_category_ids: body.hidden_category_ids,
    };
    const response = await fetch(`${getBackendUrl()}/dashboard/preferences`, {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(
        data,
        "Failed to update dashboard preferences",
        response.status
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
