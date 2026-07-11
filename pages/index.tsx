import React, { useState, useEffect, useMemo, useCallback } from "react"

import Link from "next/link"
import { Inter } from "next/font/google"
import { BuyOrder } from "@/interfaces/buyOrder"
import { SellOrder } from "@/interfaces/sellOrder"

import StatTile from "@/components/StatTile"
import PortfolioTable, { PortfolioPosition } from "@/components/live/PortfolioTable"
import PnlBarChart, { PnlRow } from "@/components/PnlBarChart"
import ProfitsLineChart from "@/components/ProfitsLineChart"
import { profitPercent, realizedPnl } from "@/utils/profit"
import { usd } from "@/utils/format"

const inter = Inter({ subsets: ["latin"] })

interface Quote {
    bid: number | null
}

export default function Home() {

    const [holdings, setHoldings] = useState<BuyOrder[]>([])
    const [quotes, setQuotes] = useState<Record<string, Quote>>({})
    const [sellOrders, setSellOrders] = useState<SellOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)    // first load only
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadAll = useCallback(async () => {
        setIsRefreshing(true)
        setError(null)
        try {
            const [holdingsRes, sellsRes] = await Promise.all([
                fetch('/api/currentHoldings'),
                fetch('/api/sellOrders?days=0'),   // all-time, for realized P&L
            ])
            const holdingsData = await holdingsRes.json()
            const sellsData = await sellsRes.json()
            if (!holdingsRes.ok || !Array.isArray(holdingsData)) {
                throw new Error(holdingsData?.error || `holdings: unexpected response (${holdingsRes.status})`)
            }
            if (!sellsRes.ok || !Array.isArray(sellsData)) {
                throw new Error(sellsData?.error || `sell orders: unexpected response (${sellsRes.status})`)
            }

            const pairs = Array.from(new Set(holdingsData.map((l: BuyOrder) => l.symbol).filter(Boolean)))
            let quotesData: Record<string, Quote> = {}
            if (pairs.length > 0) {
                const quotesRes = await fetch(`/api/prices?symbols=${encodeURIComponent(pairs.join(","))}`)
                const q = await quotesRes.json()
                if (!quotesRes.ok) {
                    throw new Error(q?.error || `prices: unexpected response (${quotesRes.status})`)
                }
                quotesData = q
            }

            setHoldings(holdingsData)
            setSellOrders(sellsData)
            setQuotes(quotesData)
            setLastUpdated(Date.now())
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadAll()
    }, [loadAll])

    // group open lots into per-coin positions, priced off the exchange bid
    const positions = useMemo<PortfolioPosition[]>(() => {
        const byTicker: Record<string, BuyOrder[]> = {}
        holdings.forEach(lot => {
            if (!lot.symbol || !lot.filled) return
            (byTicker[lot.symbol] ||= []).push(lot)
        })

        return Object.entries(byTicker).map(([ticker, lots]) => {
            const shares = lots.reduce((s, l) => s + l.filled, 0)
            const cost = lots.reduce((s, l) => s + l.cost, 0)
            const fees = lots.reduce((s, l) => s + l.fee.cost, 0)
            const avgPrice = cost / shares
            const bid = quotes[ticker]?.bid ?? null

            let marketValue: number | null = null
            let unrealized: number | null = null
            let unrealizedPct: number | null = null
            // new lot objects — never mutate the `holdings` state in a memo
            let pricedLots = lots
            if (bid) {
                marketValue = bid * shares
                unrealized = marketValue - (cost + fees)
                unrealizedPct = profitPercent({ price: avgPrice, shares, cost, fee: fees }, bid)
                pricedLots = lots.map(lot => ({
                    ...lot,
                    profit: profitPercent({ price: lot.price, shares: lot.filled, cost: lot.cost, fee: lot.fee.cost }, bid),
                }))
            }

            return { ticker, shares, avgPrice, currentPrice: bid, cost, fees, marketValue, unrealized, unrealizedPct, lots: pricedLots }
        }).sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
    }, [holdings, quotes])

    const realizedByCoin = useMemo<Record<string, number>>(() => {
        const out: Record<string, number> = {}
        sellOrders.forEach(so => {
            const ticker = so.sell_order.symbol
            out[ticker] = (out[ticker] ?? 0) + realizedPnl(so)
        })
        return out
    }, [sellOrders])

    // one bar per coin: realized + unrealized combined, tooltip shows the split
    const pnlRows = useMemo<PnlRow[]>(() => {
        const tickers = new Set([...Object.keys(realizedByCoin), ...positions.map(p => p.ticker)])
        return Array.from(tickers).map(ticker => {
            const realized = realizedByCoin[ticker] ?? 0
            const position = positions.find(p => p.ticker === ticker)
            const unrealized = position?.unrealized ?? 0
            return {
                label: ticker.split("/")[0],
                value: realized + unrealized,
                breakdown: [
                    `realized: $${realized.toFixed(2)}`,
                    `unrealized: $${unrealized.toFixed(2)}${position && position.unrealized === null ? " (no current price)" : ""}`,
                ],
            }
        })
    }, [realizedByCoin, positions])

    const totals = useMemo(() => {
        const priced = positions.filter(p => p.marketValue !== null)
        const marketValue = priced.reduce((s, p) => s + (p.marketValue ?? 0), 0)
        const costBasis = priced.reduce((s, p) => s + p.cost + p.fees, 0)
        const unrealized = marketValue - costBasis
        const realized = Object.values(realizedByCoin).reduce((s, v) => s + v, 0)
        const unpriced = positions.filter(p => p.marketValue === null).map(p => p.ticker.split("/")[0])
        const openLots = positions.reduce((s, p) => s + p.lots.length, 0)
        return { marketValue, costBasis, unrealized, realized, unpriced, openLots }
    }, [positions, realizedByCoin])

    return (
        <main className={`min-h-screen bg-black text-white p-6 ${inter.className}`}>
            <div className="max-w-7xl mx-auto flex flex-col gap-6">

                <div className="flex items-baseline justify-between border-b border-neutral-800 pb-4">
                    <p className="text-3xl font-mono">Crypto-Bot Dashboard</p>
                    <div className="flex items-baseline gap-4">
                        {lastUpdated && (
                            <span className="text-xs text-neutral-500">
                                updated {new Date(lastUpdated).toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={loadAll}
                            disabled={isRefreshing}
                            className="text-sm rounded-lg border border-neutral-700 px-3 py-1 hover:bg-neutral-800 disabled:opacity-50">
                            {isRefreshing ? "Refreshing…" : "Refresh"}
                        </button>
                        <Link href="/backtest" className="text-sm text-blue-400 hover:underline">Backtest results →</Link>
                    </div>
                </div>

                {isLoading && <p className="text-neutral-400">Loading live data…</p>}
                {error && <p className="text-red-400">Error: {error}</p>}
                {totals.unpriced.length > 0 && (
                    <p className="text-yellow-500 text-sm">
                        No current price for {totals.unpriced.join(", ")} (delisted from the exchange) — excluded from market value and unrealized totals.
                    </p>
                )}

                {!isLoading && !error && (
                    <>
                        <div className="flex flex-wrap gap-3">
                            <StatTile label="Total P&L" value={usd(totals.realized + totals.unrealized)} sign={totals.realized + totals.unrealized} />
                            <StatTile label="Realized P&L (all time)" value={usd(totals.realized)} sign={totals.realized} />
                            <StatTile label="Unrealized P&L" value={usd(totals.unrealized)} sign={totals.unrealized} />
                            <StatTile label="Market value" value={usd(totals.marketValue)} />
                            <StatTile label="Cost basis" value={usd(totals.costBasis)} />
                            <StatTile label="Performance" value={`${totals.costBasis > 0 ? (totals.unrealized / totals.costBasis * 100).toFixed(2) : "--"}%`} sign={totals.unrealized} />
                            <StatTile label="Open positions" value={`${positions.length} coins / ${totals.openLots} lots`} />
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                            <p className="text-xl font-bold pb-3">Portfolio</p>
                            <PortfolioTable positions={positions} />
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                            <p className="text-xl font-bold pb-3">P&L by coin <span className="text-sm font-normal text-neutral-400">(realized + unrealized, hover for split)</span></p>
                            <PnlBarChart rows={pnlRows} />
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                            <p className="text-xl font-bold pb-3">Realized profit over time</p>
                            <ProfitsLineChart sellOrders={sellOrders} />
                        </div>
                    </>
                )}

            </div>
        </main>
    )
}
