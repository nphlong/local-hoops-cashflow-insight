import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  clampIso,
  type CompareGrain,
  type DateRange,
  formatRange,
  resolveActiveWindow,
  resolveWindow,
  toIso,
} from '../../store/periods'

type PresetId =
  | '1d'
  | '7d'
  | '30d'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'

const PRESETS: { id: PresetId; label: string }[] = [
  { id: '1d', label: '1d' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_year', label: 'Last year' },
]

const matchRange = (a: DateRange, b: DateRange) => a.start === b.start && a.end === b.end

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const monthMatrix = (year: number, month: number) => {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIso(new Date(year, month, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const shiftMonth = (anchor: Date, delta: number) =>
  new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)

export interface DateRangePickerProps {
  asOf: string
  grain: CompareGrain
  customRange: DateRange | null
  onGrain: (grain: CompareGrain) => void
  onCustomRange: (range: DateRange) => void
  compact?: boolean
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  asOf,
  grain,
  customRange,
  onGrain,
  onCustomRange,
  compact = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  const [draftStart, setDraftStart] = useState<string | null>(null)
  const window = resolveActiveWindow({ grain, customRange }, asOf)
  const asOfDate = useMemo(() => new Date(`${asOf}T12:00:00`), [asOf])
  const [leftMonth, setLeftMonth] = useState(
    () => new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 1),
  )

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activePreset = useMemo((): PresetId | null => {
    if (!customRange) {
      if (grain === 'week') return 'this_week'
      if (grain === 'month') return 'this_month'
      if (grain === 'year') return 'this_year'
    }
    const week = resolveWindow('week', asOf)
    const month = resolveWindow('month', asOf)
    const year = resolveWindow('year', asOf)
    const current = customRange ?? resolveWindow(grain, asOf).current
    if (matchRange(current, { start: asOf, end: asOf })) return '1d'
    if (matchRange(current, { start: addDays(asOf, -6), end: asOf })) return '7d'
    if (matchRange(current, { start: addDays(asOf, -29), end: asOf })) return '30d'
    if (matchRange(current, week.current)) return 'this_week'
    if (matchRange(current, week.prior)) return 'last_week'
    if (matchRange(current, month.current)) return 'this_month'
    if (matchRange(current, month.prior)) return 'last_month'
    if (matchRange(current, year.current)) return 'this_year'
    if (matchRange(current, year.prior)) return 'last_year'
    return null
  }, [asOf, customRange, grain])

  const applyPreset = (id: PresetId) => {
    setDraftStart(null)
    if (id === 'this_week') {
      onGrain('week')
    } else if (id === 'this_month') {
      onGrain('month')
    } else if (id === 'this_year') {
      onGrain('year')
    } else if (id === '1d') {
      onCustomRange({ start: asOf, end: asOf })
    } else if (id === '7d') {
      onCustomRange({ start: addDays(asOf, -6), end: asOf })
    } else if (id === '30d') {
      onCustomRange({ start: addDays(asOf, -29), end: asOf })
    } else if (id === 'last_week') {
      onCustomRange(resolveWindow('week', asOf).prior)
    } else if (id === 'last_month') {
      onCustomRange(resolveWindow('month', asOf).prior)
    } else if (id === 'last_year') {
      onCustomRange(resolveWindow('year', asOf).prior)
    }
    setOpen(false)
  }

  const selectDay = (iso: string) => {
    if (iso > asOf) return
    if (!draftStart) {
      setDraftStart(iso)
      return
    }
    const start = iso < draftStart ? iso : draftStart
    const end = clampIso(iso < draftStart ? draftStart : iso, asOf)
    onCustomRange({ start, end })
    setDraftStart(null)
    setOpen(false)
  }

  const previewRange = useMemo((): DateRange | null => {
    if (!draftStart) return null
    const end = hoverDay ?? draftStart
    return {
      start: end < draftStart ? end : draftStart,
      end: clampIso(end < draftStart ? draftStart : end, asOf),
    }
  }, [asOf, draftStart, hoverDay])

  const highlight = previewRange ?? window.current

  const dayClass = (iso: string | null) => {
    if (!iso) return 'drp-day is-empty'
    const classes = ['drp-day']
    if (iso > asOf) classes.push('is-future')
    if (iso === highlight.start || iso === highlight.end) classes.push('is-edge')
    else if (iso > highlight.start && iso < highlight.end) classes.push('is-mid')
    if (iso === asOf) classes.push('is-asof')
    return classes.join(' ')
  }

  const rightMonth = shiftMonth(leftMonth, 1)
  const months = [
    { label: leftMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells: monthMatrix(leftMonth.getFullYear(), leftMonth.getMonth()) },
    { label: rightMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells: monthMatrix(rightMonth.getFullYear(), rightMonth.getMonth()) },
  ]

  return (
    <div className={`date-range-picker${compact ? ' is-compact' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="drp-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="drp-trigger-icon" aria-hidden>
          📅
        </span>
        <span className="drp-trigger-label">{formatRange(window.current)}</span>
      </button>
      {open && (
        <div className="drp-popover" role="dialog" aria-label="Date range">
          <div className="drp-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="drp-preset"
                aria-pressed={activePreset === preset.id}
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="drp-calendars">
            <div className="drp-cal-nav">
              <button type="button" className="drp-nav-btn" aria-label="Previous months" onClick={() => setLeftMonth((m) => shiftMonth(m, -1))}>
                ‹
              </button>
              <button type="button" className="drp-nav-btn" aria-label="Next months" onClick={() => setLeftMonth((m) => shiftMonth(m, 1))}>
                ›
              </button>
            </div>
            <div className="drp-month-grid">
              {months.map((month) => (
                <div key={month.label} className="drp-month">
                  <p className="drp-month-title">{month.label}</p>
                  <div className="drp-weekdays">
                    {WEEKDAYS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="drp-days">
                    {month.cells.map((iso, index) => (
                      <button
                        key={`${month.label}-${index}`}
                        type="button"
                        className={dayClass(iso)}
                        disabled={!iso || iso > asOf}
                        onMouseEnter={() => iso && setHoverDay(iso)}
                        onMouseLeave={() => setHoverDay(null)}
                        onClick={() => iso && selectDay(iso)}
                      >
                        {iso ? Number(iso.slice(8, 10)) : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
