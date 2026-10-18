/**
 * Currency Formatter Utility
 * Formats currency values for display in the application
 */

/**
 * Formats a number as currency
 * @param value - The numeric value to format
 * @param currency - Optional currency code (default: 'USD')
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
};

/**
 * Formats a number as percentage
 * @param value - The numeric value to format (0-1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formats a number with thousand separators
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatCompactCurrency = (value: number): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return formatCurrency(value)
}
