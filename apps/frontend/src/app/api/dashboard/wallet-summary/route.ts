import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../../_lib/bff";

interface DashboardWalletSummaryBody {
  wallet_ids?: unknown;
}

function backendErrorResponse(
  data: { message?: string } | null,
  fallback: string,
  status: number,
) {
  return NextResponse.json({ message: data?.message ?? fallback }, { status });
}

export async function GET() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(`${getBackendUrl()}/dashboard/wallet-summary`, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(
        data,
        "Failed to load dashboard wallet summary",
        response.status,
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

    let body: DashboardWalletSummaryBody;

    try {
      body = (await request.json()) as DashboardWalletSummaryBody;
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const response = await fetch(`${getBackendUrl()}/dashboard/wallet-summary`, {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_ids: body.wallet_ids }),
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(
        data,
        "Failed to update dashboard wallet summary",
        response.status,
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
