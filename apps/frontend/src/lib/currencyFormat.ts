const TWO_DECIMAL_PLACES = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

export function formatCurrency(
  value: string | number,
  currency = "THB",
) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    ...TWO_DECIMAL_PLACES,
  }).format(Number(value));
}

export function formatMoneyAmount(value: string | number) {
  return new Intl.NumberFormat("th-TH", TWO_DECIMAL_PLACES).format(
    Number(value),
  );
}
