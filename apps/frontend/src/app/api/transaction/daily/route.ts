import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../transaction-bff";

const DAILY_TRANSACTION_QUERY_PARAMS = [
  "walletId",
  "date",
  "type",
  "categoryId",
  "search",
  "page",
] as const;

function buildDailyTransactionUrl(request: NextRequest) {
  const url = new URL(`${getBackendUrl()}/transaction/daily`);

  DAILY_TRANSACTION_QUERY_PARAMS.forEach((key) => {
    const value = request.nextUrl.searchParams.get(key);

    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const response = await fetch(buildDailyTransactionUrl(request), {
      headers: authHeader,
      cache: "no-store",
    });
    const data = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load daily transactions" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return serverNotReadyResponse();
  }
}
