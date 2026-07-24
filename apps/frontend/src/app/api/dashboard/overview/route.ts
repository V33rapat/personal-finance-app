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

    const url = new URL(`${getBackendUrl()}/dashboard/overview`);
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (start) {
      url.searchParams.set("start", start);
    }

    if (end) {
      url.searchParams.set("end", end);
    }

    const response = await fetch(url, {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load dashboard overview" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
