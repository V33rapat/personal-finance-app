import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendTransferBody,
  TransferRequestBody,
  unauthorizedResponse,
} from "../transfer-bff";

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

    const res = await fetch(`${getBackendUrl()}/transfer/${id}`, {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load transfer" },
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
    const body = (await request.json()) as TransferRequestBody;

    const res = await fetch(`${getBackendUrl()}/transfer/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendTransferBody(body)),
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to update transfer" },
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

    const res = await fetch(`${getBackendUrl()}/transfer/${id}`, {
      method: "DELETE",
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to delete transfer" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
