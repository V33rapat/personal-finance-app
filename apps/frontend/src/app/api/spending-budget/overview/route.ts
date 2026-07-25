import { NextRequest, NextResponse } from "next/server";
import {
  backendErrorResponse,
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../spending-budget-bff";

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const url = new URL(`${getBackendUrl()}/spending-budget/overview`);

    for (const key of ["period", "date", "start", "end", "month", "year"]) {
      const value = request.nextUrl.searchParams.get(key);

      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return backendErrorResponse(data, "Failed to load spending budget overview", response.status);
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
