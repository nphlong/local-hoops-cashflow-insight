export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyShort = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};