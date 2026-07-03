import React, { useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import 'chartjs-adapter-date-fns'
import { enUS } from 'date-fns/locale'
import { SellOrder } from "@/interfaces/sellOrder"
import { realizedPnl } from "@/utils/profit"
import { CHART_COLORS, timeScale, linearScale, legendOptions } from "@/components/chartTheme"

type Props = {
    sellOrders: SellOrder[]   // all-time, any order
}

// Cumulative realized P&L: one point per sell, proceeds minus what the
// closed lots cost (incl. buy fees) — same settlement math as the bot.
const ProfitsLineChart = ({ sellOrders }: Props) => {
    const chartRef = useRef<Chart | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || sellOrders.length === 0) {
            return
        }

        const sorted = [...sellOrders].sort((a, b) => a.sell_order.timestamp - b.sell_order.timestamp)
        let profit = 0
        const dataPoints = sorted.map((sellOrder) => {
            profit += realizedPnl(sellOrder)
            return { x: sellOrder.sell_order.timestamp, y: profit }
        })

        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: "Realized profit (cumulative)",
                    data: dataPoints,
                    borderColor: CHART_COLORS.series1,
                    backgroundColor: CHART_COLORS.series1,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 12,
                    tension: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: legendOptions(false),
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `cumulative: $${Number(ctx.parsed.y).toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: { ...timeScale('day'), adapters: { date: { locale: enUS } } } as any,
                    y: linearScale('USD') as any,
                },
            }
        })

        chartRef.current = chart

        return () => {
            chart.destroy()
            if (chartRef.current === chart) {
                chartRef.current = null
            }
        }

    }, [sellOrders])

    return (
        <div className="relative h-80">
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

export default ProfitsLineChart
