import { NextRequest, NextResponse } from "next/server";
import {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  toBackendTemplateBody,
  type TransactionTemplateRequestBody,
  unauthorizedResponse,
} from "./transaction-template-bff";

function buildTemplateUrl(request: NextRequest) {
  const url = new URL(`${getBackendUrl()}/transaction-template`);
  const type = request.nextUrl.searchParams.get("type");

  if (type === "income" || type === "expense") {
    url.searchParams.set("type", type);
  }

  return url;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = await getAuthHeader();

    if (!authHeader) {
      return unauthorizedResponse();
    }

    const res = await fetch(buildTemplateUrl(request), {
      headers: authHeader,
      cache: "no-store",
    });

    const data = await readJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Failed to load transaction templates" },
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

    const body = (await request.json()) as TransactionTemplateRequestBody;

    const res = await fetch(`${getBackendUrl()}/transaction-template`, {
      method: "POST",
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
        { message: data?.message ?? "Failed to create transaction template" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return serverNotReadyResponse();
  }
}
