import type { AllocationFormValues, MoneyAllocation } from "../hooks/useAllocation";
import { getTodayDateString } from "./allocationDate";

export function getAllocationFormValues(
  allocation: MoneyAllocation,
  allocationDate = allocation.allocation_date,
): AllocationFormValues {
  return {
    source_wallet_id: allocation.source_wallet_id,
    amount: allocation.amount,
    allocation_date: allocationDate,
    note: allocation.note,
    destinations: allocation.destinations.map((destination) => ({
      wallet_id: destination.wallet_id,
      amount: destination.amount,
    })),
  };
}

export function getAllocationDuplicateValues(
  allocation: MoneyAllocation,
  today = getTodayDateString(),
): AllocationFormValues {
  return getAllocationFormValues(allocation, today);
}
