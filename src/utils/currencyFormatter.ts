const localeFor = (currency: string) => (currency === 'VND' ? 'vi-VN' : 'en-US')

export const formatCurrency = (
  value: number,
  currency: string = 'VND',
  options?: Intl.NumberFormatOptions,
): string => {
  return new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
    ...options,
  }).format(value)
}

export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export const formatCompactCurrency = (value: number, currency: string = 'VND'): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const symbol = currency === 'VND' ? '₫' : '$'
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`
  return formatCurrency(value, currency)
}
