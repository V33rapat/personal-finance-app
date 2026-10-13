import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const cookiesMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

function createRequest(method: "PATCH" | "DELETE", body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/transaction/transaction-1", {
    method,
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

function routeContext() {
  return { params: Promise.resolve({ id: "transaction-1" }) };
}

describe("transaction item BFF routes", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.com/";
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards an update without template or response-only metadata", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "access-token" }),
    } satisfies CookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "transaction-1" }), { status: 200 }),
    );

    const response = await PATCH(
      createRequest("PATCH", {
        id: "should-be-ignored",
        management: "allocation",
        wallet_id: "wallet-1",
        name: "  Dinner  ",
        amount: "90",
        type: "expense",
        category_id: null,
        template_id: "old-template",
        transaction_date: "2026-07-20",
        note: "  note  ",
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://backend.example.com/transaction/transaction-1");
    expect(options).toMatchObject({
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
    expect(JSON.parse(String(options.body))).toEqual({
      wallet_id: "wallet-1",
      name: "Dinner",
      amount: 90,
      type: "expense",
      category_id: null,
      transaction_date: "2026-07-20",
      note: "note",
    });
  });

  it("deletes a transaction with the bearer token", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "access-token" }),
    } satisfies CookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), { status: 200 }),
    );

    const response = await DELETE(
      createRequest("DELETE"),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/transaction/transaction-1",
      {
        method: "DELETE",
        headers: { Authorization: "Bearer access-token" },
        cache: "no-store",
      },
    );
  });

  it("returns 401 for edit/delete routes without a token", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined } satisfies CookieStore);

    const patchResponse = await PATCH(
      createRequest("PATCH", { name: "Dinner" }),
      routeContext(),
    );
    const deleteResponse = await DELETE(
      createRequest("DELETE"),
      routeContext(),
    );

    expect(patchResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes delete errors through to the browser", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "access-token" }),
    } satisfies CookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Managed transaction" }), {
        status: 400,
      }),
    );

    const response = await DELETE(
      createRequest("DELETE"),
      routeContext(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Managed transaction" });
  });
});
