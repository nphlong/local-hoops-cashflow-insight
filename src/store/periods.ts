import { AS_OF_DATE, type LedgerTransaction } from '../data/mockCashflow'

export type CompareGrain = 'week' | 'month' | 'year'

export interface DateRange {
  start: string
  end: string
}

export interface PeriodWindow {
  grain: CompareGrain
  current: DateRange
  prior: DateRange
  currentLabel: string
  priorLabel: string
}

export interface PeriodSelection {
  grain: CompareGrain
  customRange?: DateRange | null
}

const toDate = (iso: string) => new Date(`${iso}T12:00:00`)

export const toIso = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (iso: string, days: number) => {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

export const clampIso = (iso: string, maxIso: string) => (iso > maxIso ? maxIso : iso)

export const formatRange = (range: DateRange) => {
  const a = toDate(range.start)
  const b = toDate(range.end)
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  if (sameMonth) {
    const month = a.toLocaleDateString('en-US', { month: 'short' })
    return `${month} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
  }
  const left = a.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
  const right = b.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${left} – ${right}`
}

export const inclusiveDayCount = (range: DateRange) => {
  const ms = toDate(range.end).getTime() - toDate(range.start).getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

export const priorRangeOfSameLength = (range: DateRange): DateRange => {
  const days = inclusiveDayCount(range)
  const priorEnd = addDays(range.start, -1)
  const priorStart = addDays(priorEnd, -(days - 1))
  return { start: priorStart, end: priorEnd }
}

export const inRange = (date: string, range: DateRange) => date >= range.start && date <= range.end

export const windowFromCustomRange = (range: DateRange, asOf: string = AS_OF_DATE): PeriodWindow => {
  const end = clampIso(range.end, asOf)
  const start = range.start > end ? end : range.start
  const current = { start, end }
  const prior = priorRangeOfSameLength(current)
  return {
    grain: 'month',
    current,
    prior,
    currentLabel: formatRange(current),
    priorLabel: formatRange(prior),
  }
}

export const resolveActiveWindow = (
  selection: PeriodSelection,
  asOf: string = AS_OF_DATE,
): PeriodWindow => {
  if (selection.customRange?.start && selection.customRange?.end) {
    return windowFromCustomRange(selection.customRange, asOf)
  }
  return resolveWindow(selection.grain, asOf)
}

export const resolveWindow = (grain: CompareGrain, asOf: string = AS_OF_DATE): PeriodWindow => {
  const asOfDate = toDate(asOf)
  if (grain === 'week') {
    const current = { start: addDays(asOf, -6), end: asOf }
    const prior = { start: addDays(asOf, -13), end: addDays(asOf, -7) }
    return {
      grain,
      current,
      prior,
      currentLabel: `This week (${formatRange(current)})`,
      priorLabel: `Last week (${formatRange(prior)})`,
    }
  }
  if (grain === 'month') {
    const start = `${asOfDate.getFullYear()}-${String(asOfDate.getMonth() + 1).padStart(2, '0')}-01`
    const current = { start, end: asOf }
    const priorMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 1)
    const priorEndDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0)
    const priorDay = Math.min(asOfDate.getDate(), priorEndDate.getDate())
    const priorEnd = toIso(new Date(priorMonth.getFullYear(), priorMonth.getMonth(), priorDay))
    const prior = { start: toIso(priorMonth), end: priorEnd }
    return {
      grain,
      current,
      prior,
      currentLabel: `This month (${formatRange(current)})`,
      priorLabel: `Last month (${formatRange(prior)})`,
    }
  }
  const current = { start: `${asOfDate.getFullYear()}-01-01`, end: asOf }
  const priorDay = new Date(asOfDate.getFullYear() - 1, asOfDate.getMonth(), asOfDate.getDate())
  const prior = { start: `${asOfDate.getFullYear() - 1}-01-01`, end: toIso(priorDay) }
  return {
    grain,
    current,
    prior,
    currentLabel: `This year (${formatRange(current)})`,
    priorLabel: `Last year (${formatRange(prior)})`,
  }
}

export const inWindow = (transactions: LedgerTransaction[], range: DateRange) =>
  transactions.filter((tx) => inRange(tx.date, range))

export interface BucketPoint {
  key: string
  label: string
  inflow: number
  outflow: number
}

const weekKey = (isoDate: string) => {
  const d = toDate(isoDate)
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const day = d.getDay() || 7
  const thursday = new Date(utc)
  thursday.setUTCDate(d.getDate() + 4 - day)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((+thursday - +yearStart) / 86400000 + 1) / 7)
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export const lastTwelveMonths = (transactions: LedgerTransaction[], asOf: string = AS_OF_DATE): BucketPoint[] => {
  const asOfDate = toDate(asOf)
  const buckets = bucketSeries(transactions, 'month')
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  const points: BucketPoint[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const existing = byKey.get(key)
    points.push({ key, label, inflow: existing?.inflow ?? 0, outflow: existing?.outflow ?? 0 })
  }
  return points
}

export const bucketSeries = (transactions: LedgerTransaction[], grain: CompareGrain): BucketPoint[] => {
  const map = new Map<string, BucketPoint>()
  for (const tx of transactions) {
    let key = tx.date.slice(0, 7)
    let label = toDate(tx.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (grain === 'week') {
      key = weekKey(tx.date)
      const start = addDays(tx.date, -((toDate(tx.date).getDay() + 6) % 7))
      label = toDate(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (grain === 'year') {
      key = tx.date.slice(0, 4)
      label = tx.date.slice(0, 4)
    }
    const point = map.get(key) ?? { key, label, inflow: 0, outflow: 0 }
    if (tx.categoryType === 'inflow') point.inflow += tx.amount
    else point.outflow += tx.amount
    map.set(key, point)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}
