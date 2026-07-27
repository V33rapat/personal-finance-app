import { NextResponse } from "next/server";

export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export interface SpendingBudgetRequestBody {
  name?: unknown;
  amount?: unknown;
  period?: unknown;
  categoryIds?: unknown;
  category_ids?: unknown;
  includesUncategorized?: unknown;
  includes_uncategorized?: unknown;
  walletScope?: unknown;
  wallet_scope?: unknown;
  walletIds?: unknown;
  wallet_ids?: unknown;
  isActive?: unknown;
  is_active?: unknown;
}

function getValue(
  body: SpendingBudgetRequestBody,
  camelCaseKey: keyof SpendingBudgetRequestBody,
  snakeCaseKey: keyof SpendingBudgetRequestBody
) {
  return body[camelCaseKey] ?? body[snakeCaseKey];
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function toBackendAmount(value: unknown) {
  return typeof value === "string" ? Number(value) : value;
}

export function toBackendSpendingBudgetCreateBody(body: SpendingBudgetRequestBody) {
  return {
    name: trimString(body.name),
    amount: toBackendAmount(body.amount),
    period: body.period,
    category_ids: getValue(body, "categoryIds", "category_ids"),
    includes_uncategorized: getValue(
      body,
      "includesUncategorized",
      "includes_uncategorized"
    ),
    wallet_scope: getValue(body, "walletScope", "wallet_scope"),
    wallet_ids: getValue(body, "walletIds", "wallet_ids"),
  };
}

export function toBackendSpendingBudgetUpdateBody(body: SpendingBudgetRequestBody) {
  return {
    ...toBackendSpendingBudgetCreateBody(body),
    is_active: getValue(body, "isActive", "is_active"),
  };
}

export function backendErrorResponse(
  data: { message?: string } | null,
  fallback: string,
  status: number
) {
  return NextResponse.json({ message: data?.message ?? fallback }, { status });
}
