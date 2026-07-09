import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendTemplateBody,
  type TransactionTemplateRequestBody,
  unauthorizedResponse,
} from "../transaction-template-bff";

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

    const res = await fetch(`${getBackendUrl()}/transaction-template/${id}`, {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load transaction template" },
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
    const body = (await request.json()) as TransactionTemplateRequestBody;

    const res = await fetch(`${getBackendUrl()}/transaction-template/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(toBackendTemplateBody(body)),
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to update transaction template" },
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

    const res = await fetch(`${getBackendUrl()}/transaction-template/${id}`, {
      method: "DELETE",
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to delete transaction template" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
