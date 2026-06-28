import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendWalletBody,
  unauthorizedResponse,
  WalletRequestBody,
} from "./wallet-bff";

export async function GET() {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const res = await fetch(`${getBackendUrl()}/wallet`, {
      headers: authHeader,
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load wallets" },
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

    const body = (await request.json()) as WalletRequestBody;

    const res = await fetch(`${getBackendUrl()}/wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendWalletBody(body)),
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to create wallet" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
