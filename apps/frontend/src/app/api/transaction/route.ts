import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendTransactionCreateBody,
  type TransactionRequestBody,
  unauthorizedResponse,
} from "./transaction-bff";

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const walletId = searchParams.get("walletId");

    const url = new URL(`${getBackendUrl()}/transaction`);

    if (walletId) {
      url.searchParams.set("walletId", walletId);
    }

    const res = await fetch(url, {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load transactions" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
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

    const body = (await request.json()) as TransactionRequestBody;

    const res = await fetch(`${getBackendUrl()}/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendTransactionCreateBody(body)),
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to create transaction" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
