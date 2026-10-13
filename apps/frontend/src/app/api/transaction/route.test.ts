import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const cookiesMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transaction", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.com/";
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("forwards only create fields and normalizes user input", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "access-token" }),
    } satisfies CookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "transaction-1" }), { status: 201 }),
    );

    const response = await POST(
      createRequest({
        id: "should-be-ignored",
        created_at: "should-be-ignored",
        management: "transfer",
        deleted_at: null,
        wallet_id: "wallet-1",
        name: "  Lunch  ",
        amount: "60.50",
        type: "expense",
        category_id: "category-1",
        template_id: null,
        transaction_date: "2026-07-20",
        note: "  note  ",
      }),
    );

    expect(response.status).toBe(201);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://backend.example.com/transaction");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
    expect(JSON.parse(String(options.body))).toEqual({
      wallet_id: "wallet-1",
      name: "Lunch",
      amount: 60.5,
      type: "expense",
      category_id: "category-1",
      template_id: null,
      transaction_date: "2026-07-20",
      note: "note",
    });
  });

  it("returns 401 without calling the backend when no token exists", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined } satisfies CookieStore);

    const response = await POST(
      createRequest({ wallet_id: "wallet-1", name: "Lunch" }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the backend error status and message through", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "access-token" }),
    } satisfies CookieStore);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Wallet is inactive" }), {
        status: 400,
      }),
    );

    const response = await POST(
      createRequest({ wallet_id: "wallet-1", name: "Lunch" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Wallet is inactive" });
  });
});
