import type { Transaction } from "../components/TransactionItem";
import type { TransactionTemplateFormValues } from "../hooks/useTransactionTemplate";

export function toTemplateValuesFromTransaction(
  transaction: Transaction
): TransactionTemplateFormValues {
  return {
    name: transaction.name,
    type: transaction.type,
    default_amount: transaction.amount,
    category_id: transaction.category_id,
    note: transaction.note ?? "",
  };
}
