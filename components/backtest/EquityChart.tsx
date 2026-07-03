import React, { useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import 'chartjs-adapter-date-fns'
import { enUS } from 'date-fns/locale'
import { EquityPoint } from "@/utils/backtest"
import { CHART_COLORS, timeScale, linearScale, legendOptions } from "@/components/chartTheme"

type Props = {
    equity: EquityPoint[]
}

// Equity curve: total equity is the story (blue); cash rides along as
// de-emphasized context. Mark-to-market per candle, from equity_<stamp>.csv.
const EquityChart = ({ equity }: Props) => {
    const chartRef = useRef<Chart | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || equity.length === 0) {
            return
        }

        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Equity',
                        data: equity.map(p => ({ x: p.time, y: p.equity })),
                        borderColor: CHART_COLORS.series1,
                        backgroundColor: CHART_COLORS.series1,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHitRadius: 12,
                        tension: 0,
                    },
                    {
                        label: 'Cash',
                        data: equity.map(p => ({ x: p.time, y: p.cash })),
                        borderColor: CHART_COLORS.context,
                        backgroundColor: CHART_COLORS.context,
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHitRadius: 12,
                        tension: 0,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: legendOptions(true),
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: { ...timeScale('day'), adapters: { date: { locale: enUS } } } as any,
                    y: linearScale('USD') as any,
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
    }, [equity])

    return (
        <div className="relative h-80">
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

export default EquityChart
