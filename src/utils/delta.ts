export const formatDelta = (ratio: number) => {
  const pct = `${ratio >= 0 ? '+' : '−'}${Math.abs(ratio * 100).toFixed(1)}%`
  return pct
}
