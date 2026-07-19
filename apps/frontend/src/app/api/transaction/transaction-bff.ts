export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export interface TransactionRequestBody {
  wallet_id?: unknown;
  name?: unknown;
  amount?: unknown;
  type?: unknown;
  category_id?: unknown;
  template_id?: unknown;
  transaction_date?: unknown;
  note?: unknown;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function toBackendAmount(value: unknown) {
  return typeof value === "string" ? Number(value) : value;
}

function toBackendNote(value: unknown) {
  if (value === undefined || value === null) {
    return value;
  }

  return typeof value === "string" ? value.trim() || null : value;
}

export function toBackendTransactionCreateBody(body: TransactionRequestBody) {
  return {
    wallet_id: body.wallet_id,
    name: trimString(body.name),
    amount: toBackendAmount(body.amount),
    type: body.type,
    category_id: body.category_id,
    template_id: body.template_id,
    transaction_date: body.transaction_date,
    note: toBackendNote(body.note),
  };
}

export function toBackendTransactionUpdateBody(body: TransactionRequestBody) {
  return {
    wallet_id: body.wallet_id,
    name: trimString(body.name),
    amount: toBackendAmount(body.amount),
    type: body.type,
    category_id: body.category_id,
    transaction_date: body.transaction_date,
    note: toBackendNote(body.note),
  };
}
