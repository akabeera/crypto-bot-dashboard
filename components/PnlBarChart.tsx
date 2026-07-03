import React, { useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import { CHART_COLORS, legendOptions } from "@/components/chartTheme"

export interface PnlRow {
    label: string
    value: number
    // optional extra tooltip lines, e.g. realized/unrealized breakdown
    breakdown?: string[]
}

type Props = {
    rows: PnlRow[]
}

// Horizontal diverging bar of P&L per coin: green above zero, red below,
// sorted best-to-worst so winners and losers read at a glance.
const PnlBarChart = ({ rows }: Props) => {
    const chartRef = useRef<Chart | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || rows.length === 0) {
            return
        }

        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        const sorted = [...rows].sort((a, b) => b.value - a.value)

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sorted.map(r => r.label),
                datasets: [{
                    data: sorted.map(r => r.value),
                    backgroundColor: sorted.map(r => r.value >= 0 ? CHART_COLORS.buy : CHART_COLORS.sell),
                    borderRadius: 4,
                    borderSkipped: 'start',
                    maxBarThickness: 18,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: legendOptions(false),
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const row = sorted[ctx.dataIndex]
                                const lines = [`P&L: $${row.value.toFixed(2)}`]
                                if (row.breakdown) {
                                    lines.push(...row.breakdown)
                                }
                                return lines
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: CHART_COLORS.gridline },
                        border: { color: CHART_COLORS.axis },
                        ticks: { color: CHART_COLORS.muted, callback: (v) => `$${v}` },
                    },
                    y: {
                        grid: { display: false },
                        border: { color: CHART_COLORS.axis },
                        ticks: { color: CHART_COLORS.textSecondary },
                    }
                }
            }
        })
        chartRef.current = chart

        return () => {
            chart.destroy()
            if (chartRef.current === chart) {
                chartRef.current = null
            }
        }
    }, [rows])

    // enough height for every row plus the axis band
    const height = Math.max(160, rows.length * 28 + 60)

    return (
        <div className="relative" style={{ height }}>
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

export default PnlBarChart
