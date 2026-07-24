import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../../_lib/bff";

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const url = new URL(`${getBackendUrl()}/dashboard/summary`);
    const month = request.nextUrl.searchParams.get("month");

    if (month) {
      url.searchParams.set("month", month);
    }

    const response = await fetch(url, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load dashboard summary" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
