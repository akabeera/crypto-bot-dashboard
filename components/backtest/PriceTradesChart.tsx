import React, { useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import 'chartjs-adapter-date-fns'
import { enUS } from 'date-fns/locale'
import { BacktestTrade, CandlePoint } from "@/utils/backtest"
import { CHART_COLORS, timeScale, linearScale, legendOptions } from "@/components/chartTheme"

type Props = {
    ticker: string
    candles: CandlePoint[]
    trades: BacktestTrade[]   // already filtered to this ticker
}

// Price with fills overlaid: the price line is context (gray), the buy/sell
// markers are the story. This is the chart that makes frozen lots visible —
// buys with no matching sells stand out immediately.
const PriceTradesChart = ({ ticker, candles, trades }: Props) => {
    const chartRef = useRef<Chart | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || candles.length === 0) {
            return
        }

        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        const buys = trades.filter(t => t.side === 'buy')
        const sells = trades.filter(t => t.side !== 'buy')

        const tradeTooltip = (side: 'buy' | 'sell') => (ctx: any) => {
            const t: BacktestTrade = (side === 'buy' ? buys : sells)[ctx.dataIndex]
            if (!t) return ''
            const lines = [
                `${t.side} @ $${t.price} — ${t.shares.toPrecision(6)} shares`,
                `reason: ${t.reason}`,
            ]
            if (side === 'sell') {
                lines.push(`pnl: $${t.pnl.toFixed(2)} (${t.pnl_percent.toFixed(2)}%), held ${t.hold_hours.toFixed(0)}h`)
            }
            return lines
        }

        const chart = new Chart(canvas, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        type: 'line' as const,
                        label: `${ticker} close`,
                        data: candles.map(c => ({ x: c.time, y: c.close })),
                        borderColor: CHART_COLORS.context,
                        backgroundColor: CHART_COLORS.context,
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHitRadius: 0,
                        tension: 0,
                        order: 2,
                    },
                    {
                        label: 'Buys',
                        data: buys.map(t => ({ x: t.time, y: t.price })),
                        backgroundColor: CHART_COLORS.buy,
                        borderColor: CHART_COLORS.surface,
                        borderWidth: 2,
                        pointStyle: 'triangle',
                        radius: 6,
                        hoverRadius: 8,
                        pointHitRadius: 10,
                        order: 1,
                        tooltip: { callbacks: { label: tradeTooltip('buy') } },
                    } as any,
                    {
                        label: 'Sells',
                        data: sells.map(t => ({ x: t.time, y: t.price })),
                        backgroundColor: CHART_COLORS.sell,
                        borderColor: CHART_COLORS.surface,
                        borderWidth: 2,
                        pointStyle: 'triangle',
                        rotation: 180,
                        radius: 6,
                        hoverRadius: 8,
                        pointHitRadius: 10,
                        order: 0,
                        tooltip: { callbacks: { label: tradeTooltip('sell') } },
                    } as any,
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: legendOptions(true),
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
    }, [ticker, candles, trades])

    return (
        <div className="relative h-80">
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

export default PriceTradesChart
