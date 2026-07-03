import React, { useState } from "react"
import { BuyOrder } from "@/interfaces/buyOrder"
import { formatDate } from "@/utils/dates"

export interface PortfolioPosition {
    ticker: string          // full pair, e.g. "BTC/USD"
    shares: number
    avgPrice: number
    currentPrice: number | null
    cost: number            // USD spent excl. fees
    fees: number
    marketValue: number | null
    unrealized: number | null      // $
    unrealizedPct: number | null   // fee-aware %
    lots: BuyOrder[]
}

type Props = {
    positions: PortfolioPosition[]
}

function usd(n: number | null, digits = 2): string {
    if (n === null || !Number.isFinite(n)) return "--"
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function signClass(n: number | null): string {
    if (n === null || n === 0) return "text-neutral-400"
    return n > 0 ? "text-green-500" : "text-red-400"
}

// Current holdings, one row per coin, expandable to the individual lots.
const PortfolioTable = ({ positions }: Props) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    if (positions.length === 0) {
        return <p className="text-neutral-400">No open positions.</p>
    }

    const toggle = (ticker: string) =>
        setExpanded(prev => ({ ...prev, [ticker]: !prev[ticker] }))

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-800">
                        <th className="px-3 py-2 font-medium">Coin</th>
                        <th className="px-3 py-2 font-medium text-right">Shares</th>
                        <th className="px-3 py-2 font-medium text-right">Avg price</th>
                        <th className="px-3 py-2 font-medium text-right">Current</th>
                        <th className="px-3 py-2 font-medium text-right">Cost</th>
                        <th className="px-3 py-2 font-medium text-right">Market value</th>
                        <th className="px-3 py-2 font-medium text-right">Unrealized $</th>
                        <th className="px-3 py-2 font-medium text-right">Unrealized %</th>
                        <th className="px-3 py-2 font-medium text-right">Lots</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map(p => (
                        <React.Fragment key={p.ticker}>
                            <tr onClick={() => toggle(p.ticker)}
                                className="cursor-pointer border-b border-neutral-800/60 hover:bg-neutral-800">
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="text-neutral-500 pr-2">{expanded[p.ticker] ? "▾" : "▸"}</span>
                                    {p.ticker.split("/")[0]}
                                </td>
                                <td className="px-3 py-2 text-right">{p.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                                <td className="px-3 py-2 text-right">{usd(p.avgPrice, p.avgPrice < 1 ? 6 : 2)}</td>
                                <td className="px-3 py-2 text-right">{p.currentPrice !== null ? usd(p.currentPrice, p.currentPrice < 1 ? 6 : 2) : "--"}</td>
                                <td className="px-3 py-2 text-right">{usd(p.cost + p.fees)}</td>
                                <td className="px-3 py-2 text-right">{usd(p.marketValue)}</td>
                                <td className={`px-3 py-2 text-right ${signClass(p.unrealized)}`}>{usd(p.unrealized)}</td>
                                <td className={`px-3 py-2 text-right ${signClass(p.unrealizedPct)}`}>
                                    {p.unrealizedPct !== null ? `${p.unrealizedPct.toFixed(2)}%` : "--"}
                                </td>
                                <td className="px-3 py-2 text-right">{p.lots.length}</td>
                            </tr>
                            {expanded[p.ticker] && p.lots.map(lot => (
                                <tr key={lot.id} className="border-b border-neutral-800/40 bg-neutral-950 text-xs text-neutral-300">
                                    <td className="px-3 py-1.5 pl-9 whitespace-nowrap">{formatDate(lot.timestamp)}</td>
                                    <td className="px-3 py-1.5 text-right">{lot.filled.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                                    <td className="px-3 py-1.5 text-right">{usd(lot.price, lot.price < 1 ? 6 : 2)}</td>
                                    <td className="px-3 py-1.5 text-right">--</td>
                                    <td className="px-3 py-1.5 text-right">{usd(lot.cost + lot.fee.cost)}</td>
                                    <td className="px-3 py-1.5 text-right">--</td>
                                    <td className="px-3 py-1.5 text-right">--</td>
                                    <td className={`px-3 py-1.5 text-right ${signClass(lot.profit ?? null)}`}>
                                        {lot.profit !== null && lot.profit !== undefined ? `${lot.profit.toFixed(2)}%` : "--"}
                                    </td>
                                    <td className="px-3 py-1.5"></td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default PortfolioTable
