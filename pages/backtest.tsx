import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import { RunSummaryInfo, EquityPoint, BacktestTrade, CandlePoint } from "@/utils/backtest"
import EquityChart from "@/components/backtest/EquityChart"
import PriceTradesChart from "@/components/backtest/PriceTradesChart"
import RunComparisonTable from "@/components/backtest/RunComparisonTable"
import StatTile from "@/components/StatTile"
import PnlBarChart, { PnlRow } from "@/components/PnlBarChart"

const inter = Inter({ subsets: ["latin"] })

interface RunDetail {
    stamp: string
    run: any | null
    equity: EquityPoint[]
    trades: BacktestTrade[]
}

function fmtStamp(stamp: string): string {
    return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}`
}

export default function Backtest() {
    const [runs, setRuns] = useState<RunSummaryInfo[]>([])
    const [selectedStamp, setSelectedStamp] = useState<string | null>(null)
    const [detail, setDetail] = useState<RunDetail | null>(null)
    const [candlesByTicker, setCandlesByTicker] = useState<Record<string, CandlePoint[]>>({})
    const [error, setError] = useState<string | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState(false)

    // load run list once
    useEffect(() => {
        async function loadRuns() {
            try {
                const res = await fetch('/api/backtest/runs')
                const data = await res.json()
                if (!res.ok || !Array.isArray(data)) {
                    throw new Error(data?.error || `unexpected response (${res.status})`)
                }
                setRuns(data)
                const first = data.find((r: RunSummaryInfo) => r.hasRunJson) || data[0]
                if (first) {
                    setSelectedStamp(first.stamp)
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            }
        }
        loadRuns()
    }, [])

    // load detail when the selected run changes
    useEffect(() => {
        if (!selectedStamp) {
            return
        }
        async function loadDetail() {
            setIsLoadingDetail(true)
            setError(null)
            try {
                const res = await fetch(`/api/backtest/run/${selectedStamp}`)
                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data?.error || `unexpected response (${res.status})`)
                }
                setDetail(data)
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            } finally {
                setIsLoadingDetail(false)
            }
        }
        loadDetail()
    }, [selectedStamp])

    const tickers = useMemo(() => {
        if (!detail) return []
        return Array.from(new Set(detail.trades.map(t => t.ticker))).sort()
    }, [detail])

    // fetch candles for every coin in the run, in parallel
    useEffect(() => {
        if (!detail || tickers.length === 0) {
            setCandlesByTicker({})
            return
        }
        async function loadCandles() {
            const times = detail!.equity.map(p => p.time)
            const from = times.length > 0 ? times[0] : undefined
            const to = times.length > 0 ? times[times.length - 1] : undefined
            const timeframe = detail!.run?.args?.timeframe || '1h'

            const results = await Promise.allSettled(tickers.map(async (ticker) => {
                const params = new URLSearchParams({ ticker, timeframe })
                if (from) params.set('from', String(from))
                if (to) params.set('to', String(to))
                const res = await fetch(`/api/backtest/candles?${params}`)
                const data = await res.json()
                return { ticker, candles: (res.ok && Array.isArray(data) ? data : []) as CandlePoint[] }
            }))

            const byTicker: Record<string, CandlePoint[]> = {}
            results.forEach(r => {
                if (r.status === 'fulfilled') {
                    byTicker[r.value.ticker] = r.value.candles
                }
            })
            setCandlesByTicker(byTicker)
        }
        loadCandles()
    }, [detail, tickers])

    // realized P&L per coin for the selected run, from the sell fills
    const pnlRows = useMemo<PnlRow[]>(() => {
        if (!detail) return []
        const byTicker: Record<string, { pnl: number, buys: number, sells: number }> = {}
        detail.trades.forEach(t => {
            const agg = byTicker[t.ticker] ||= { pnl: 0, buys: 0, sells: 0 }
            if (t.side === 'buy') {
                agg.buys += 1
            } else {
                agg.sells += 1
                agg.pnl += t.pnl
            }
        })
        return Object.entries(byTicker).map(([ticker, agg]) => ({
            label: ticker.split("/")[0],
            value: agg.pnl,
            breakdown: [`${agg.buys} buys, ${agg.sells} sells`],
        }))
    }, [detail])

    const summary = detail?.run?.summary

    return (
        <main className={`min-h-screen bg-black text-white p-6 ${inter.className}`}>
            <div className="max-w-7xl mx-auto flex flex-col gap-6">

                <div className="flex items-baseline justify-between border-b border-neutral-800 pb-4">
                    <p className="text-3xl font-mono">Backtest Results</p>
                    <Link href="/" className="text-sm text-blue-400 hover:underline">← Live dashboard</Link>
                </div>

                {error && <p className="text-red-400">Error: {error}</p>}

                {/* filter row: scopes everything below it */}
                <div className="flex flex-wrap items-center gap-4">
                    <label className="text-sm text-neutral-400">Run</label>
                    <select
                        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
                        value={selectedStamp ?? ""}
                        onChange={e => setSelectedStamp(e.target.value)}>
                        {runs.map(r => (
                            <option key={r.stamp} value={r.stamp}>
                                {fmtStamp(r.stamp)}{r.hasRunJson ? ` — ${r.config_file}` : " (legacy, no config)"}
                            </option>
                        ))}
                    </select>

                    {isLoadingDetail && <span className="text-sm text-neutral-500">loading…</span>}
                </div>

                {summary && (
                    <div className="flex flex-wrap gap-3">
                        <StatTile label="Return" value={`${summary.return_pct?.toFixed(2)}%`} sign={summary.return_pct} />
                        <StatTile label="Buy & hold benchmark" value={`${summary.benchmark_return_pct?.toFixed(2) ?? "--"}%`} sign={summary.benchmark_return_pct} />
                        <StatTile label="Final equity" value={`$${summary.final_equity?.toFixed(2)}`} />
                        <StatTile label="Max drawdown" value={`${summary.max_drawdown_pct?.toFixed(2)}%`} sign={-1} />
                        <StatTile label="Realized P&L" value={`$${summary.realized_pnl?.toFixed(2)}`} sign={summary.realized_pnl} />
                        <StatTile label="Unrealized P&L" value={`$${summary.unrealized_pnl?.toFixed(2)}`} sign={summary.unrealized_pnl} />
                        <StatTile label="Win rate" value={`${summary.win_rate_pct?.toFixed(1)}%`} />
                        <StatTile label="Open lots" value={`${summary.open_lots ?? "--"}`} />
                    </div>
                )}

                {detail && detail.equity.length > 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-xl font-bold pb-3">Equity curve</p>
                        <EquityChart equity={detail.equity} />
                    </div>
                )}

                {pnlRows.length > 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-xl font-bold pb-3">Realized P&L by coin <span className="text-sm font-normal text-neutral-400">(this run)</span></p>
                        <PnlBarChart rows={pnlRows} />
                    </div>
                )}

                {/* every coin in the run, side by side — no per-coin clicking */}
                {tickers.length > 0 && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {tickers.map(ticker => {
                            const candles = candlesByTicker[ticker] ?? []
                            const trades = detail!.trades.filter(t => t.ticker === ticker)
                            return (
                                <div key={ticker} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                                    <p className="text-xl font-bold pb-3">{ticker} — price with fills</p>
                                    {candles.length > 0
                                        ? <PriceTradesChart ticker={ticker} candles={candles} trades={trades} />
                                        : <p className="text-neutral-400">No cached candles for {ticker}.</p>}
                                </div>
                            )
                        })}
                    </div>
                )}

                <div>
                    <p className="text-xl font-bold pb-3">Run comparison</p>
                    <RunComparisonTable
                        runs={runs}
                        selectedStamp={selectedStamp}
                        onSelect={(stamp) => setSelectedStamp(stamp)} />
                </div>

            </div>
        </main>
    )
}
