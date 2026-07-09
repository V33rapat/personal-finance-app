export {
  getAuthHeader,
  getBackendUrl,
  readJson,
  serverNotReadyResponse,
  unauthorizedResponse,
} from "../_lib/bff";

export type TransactionType = "income" | "expense";

export interface TransactionTemplateRequestBody {
  name?: string;
  type?: TransactionType;
  defaultAmount?: number | string | null;
  default_amount?: number | string | null;
  categoryId?: string | null;
  category_id?: string | null;
  note?: string | null;
}

function toBackendAmount(
  amount: TransactionTemplateRequestBody["default_amount"]
) {
  if (amount === undefined || amount === null) {
    return undefined;
  }

  return typeof amount === "string" ? Number(amount) : amount;
}

export function toBackendTemplateBody(body: TransactionTemplateRequestBody) {
  const defaultAmount =
    body.defaultAmount !== undefined ? body.defaultAmount : body.default_amount;

  return {
    name: body.name?.trim(),
    type: body.type,
    default_amount: toBackendAmount(defaultAmount),
    category_id:
      body.categoryId !== undefined ? body.categoryId : body.category_id,
    note: body.note === undefined ? undefined : body.note?.trim() || null,
  };
}
