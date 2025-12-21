export function formatCurrency(amount: number): string {
  return `PKR ${amount.toFixed(2)}`;
}

export function formatCurrencyShort(amount: number): string {
  return `Rs ${amount.toFixed(2)}`;
}

