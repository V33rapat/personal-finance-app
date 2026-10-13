import { NextResponse } from "next/server";

export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export interface SpendingPlanRequestBody {
  [key: string]: unknown;
  name?: unknown;
  startDate?: unknown;
  start_date?: unknown;
  endDate?: unknown;
  end_date?: unknown;
  effectiveDate?: unknown;
  effective_date?: unknown;
  walletIds?: unknown;
  wallet_ids?: unknown;
  purposes?: unknown;
  lastView?: unknown;
  last_view?: unknown;
  showDailyBalance?: unknown;
  show_daily_balance?: unknown;
  visiblePurposeNames?: unknown;
  visible_purpose_names?: unknown;
}

function getValue(
  body: SpendingPlanRequestBody,
  camelCaseKey: keyof SpendingPlanRequestBody,
  snakeCaseKey: keyof SpendingPlanRequestBody,
) {
  return body[camelCaseKey] ?? body[snakeCaseKey];
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function toAmount(value: unknown) {
  return typeof value === "string" ? Number(value) : value;
}

function toBackendDistribution(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const distribution = value as Record<string, unknown>;
  return {
    type: distribution.type,
    weekdays: distribution.weekdays,
    dates: distribution.dates,
  };
}

function toBackendPurpose(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const purpose = value as Record<string, unknown>;
  const categoryIds = purpose.categoryIds ?? purpose.category_ids;
  const targetAmount = purpose.targetAmount ?? purpose.target_amount;

  return {
    name: trimString(purpose.name),
    category_ids: categoryIds,
    target_amount: toAmount(targetAmount),
    distribution: toBackendDistribution(purpose.distribution),
  };
}

function toBackendPurposes(value: unknown) {
  return Array.isArray(value) ? value.map(toBackendPurpose) : value;
}

export function toBackendSpendingPlanCreateBody(body: SpendingPlanRequestBody) {
  return {
    name: trimString(body.name),
    start_date: getValue(body, "startDate", "start_date"),
    end_date: getValue(body, "endDate", "end_date"),
    wallet_ids: getValue(body, "walletIds", "wallet_ids"),
    purposes: toBackendPurposes(body.purposes),
  };
}

export function toBackendSpendingPlanUpdateBody(body: SpendingPlanRequestBody) {
  return {
    name: trimString(body.name),
    effective_date: getValue(body, "effectiveDate", "effective_date"),
    wallet_ids: getValue(body, "walletIds", "wallet_ids"),
    purposes: toBackendPurposes(body.purposes),
  };
}

export function toBackendSpendingPlanPreferencesBody(
  body: SpendingPlanRequestBody,
) {
  return {
    last_view: getValue(body, "lastView", "last_view"),
    show_daily_balance: getValue(
      body,
      "showDailyBalance",
      "show_daily_balance",
    ),
    visible_purpose_names: getValue(
      body,
      "visiblePurposeNames",
      "visible_purpose_names",
    ),
  };
}

export function backendErrorResponse(
  data: { message?: string } | null,
  fallback: string,
  status: number,
) {
  return NextResponse.json({ message: data?.message ?? fallback }, { status });
}
