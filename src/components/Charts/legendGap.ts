import type { Plugin } from 'chart.js'

/** Extra space between Chart.js legends and the plot, without lifting legends into the title. */
export const legendGap: Plugin = {
  id: 'legendGap',
  afterInit(chart) {
    const legend = chart.legend as (typeof chart.legend & { _gapPatched?: boolean }) | undefined
    if (!legend || legend._gapPatched) return
    const originalFit = legend.fit
    legend.fit = function fitWithGap() {
      originalFit.call(this)
      this.height += 16
    }
    legend._gapPatched = true
  },
}
