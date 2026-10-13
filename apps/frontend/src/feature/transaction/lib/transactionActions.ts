import { TH_TEXT } from "../../../constants/th";
import type { Transaction } from "../components/TransactionItem";
import type { TransactionFormValues } from "../hooks/useTransaction";

export type TransactionActionId = "edit" | "duplicate" | "template" | "delete";

export function isManualTransaction(
  transaction: Pick<Transaction, "management">
) {
  return !transaction.management || transaction.management === "manual";
}

export function getTransactionActionIds(
  transaction: Pick<Transaction, "management">
): TransactionActionId[] {
  return isManualTransaction(transaction)
    ? ["edit", "duplicate", "template", "delete"]
    : [];
}

export function getDuplicateTransactionValues(
  values: TransactionFormValues
): TransactionFormValues {
  return {
    ...values,
    name: `${values.name}${TH_TEXT.transaction.duplicateSuffix}`,
    template_id: null,
  };
}

export function toTransactionCreatePayload(values: TransactionFormValues) {
  return {
    wallet_id: values.wallet_id,
    name: values.name.trim(),
    amount: Number(values.amount),
    type: values.type,
    category_id: values.category_id || null,
    template_id: values.template_id || null,
    transaction_date: values.transaction_date,
    note: values.note.trim() || null,
  };
}

export function toTransactionUpdatePayload(values: TransactionFormValues) {
  return {
    wallet_id: values.wallet_id,
    name: values.name.trim(),
    amount: Number(values.amount),
    type: values.type,
    category_id: values.category_id || null,
    transaction_date: values.transaction_date,
    note: values.note.trim() || null,
  };
}
