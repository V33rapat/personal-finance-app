import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendWalletBody,
  unauthorizedResponse,
  WalletRequestBody,
} from "../wallet-bff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    const res = await fetch(`${getBackendUrl()}/wallet/${id}`, {
      headers: authHeader,
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load wallet" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as WalletRequestBody;

    const res = await fetch(`${getBackendUrl()}/wallet/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendWalletBody(body)),
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to update wallet" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
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

    const res = await fetch(`${getBackendUrl()}/wallet/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to delete wallet" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
