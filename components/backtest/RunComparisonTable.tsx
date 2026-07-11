import React from "react"
import { RunSummaryInfo } from "@/utils/backtest"
import { fmt, fmtStamp, signClass } from "@/utils/format"

type Props = {
    runs: RunSummaryInfo[]
    selectedStamp: string | null
    onSelect: (stamp: string) => void
}

// Side-by-side comparison of every run that has a run_<stamp>.json —
// the table the handoff notes were assembled by hand.
const RunComparisonTable = ({ runs, selectedStamp, onSelect }: Props) => {
    const withSummary = runs.filter(r => r.hasRunJson && r.summary)
    if (withSummary.length === 0) {
        return <p className="text-neutral-400">No runs with run_*.json summaries found.</p>
    }

    const headers = ["Run", "Config", "Overrides", "Days", "Coins", "Return %", "Benchmark %", "Max DD %",
        "Final equity", "Realized", "Unrealized", "Fees", "Win %", "Buys", "Sells", "Open lots"]

    return (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-800">
                        {headers.map(h => (
                            <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {withSummary.map(run => {
                        const s = run.summary
                        const isSelected = run.stamp === selectedStamp
                        return (
                            <tr key={run.stamp}
                                onClick={() => onSelect(run.stamp)}
                                className={`cursor-pointer border-b border-neutral-800/60 hover:bg-neutral-800 ${isSelected ? "bg-neutral-800" : ""}`}>
                                <td className="px-3 py-2 whitespace-nowrap">{fmtStamp(run.stamp)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{run.config_file || "--"}</td>
                                <td className="px-3 py-2 max-w-72 truncate" title={(run.cli_overrides || []).join(", ")}>
                                    {(run.cli_overrides || []).join(", ") || "--"}
                                </td>
                                <td className="px-3 py-2 text-right">{run.args?.days ?? "--"}</td>
                                <td className="px-3 py-2 max-w-48 truncate" title={(run.args?.coins || []).join(", ")}>
                                    {(run.args?.coins || []).map((c: string) => c.split("/")[0]).join(", ") || "--"}
                                </td>
                                <td className={`px-3 py-2 text-right ${signClass(s.return_pct)}`}>{fmt(s.return_pct)}</td>
                                <td className={`px-3 py-2 text-right ${signClass(s.benchmark_return_pct)}`}>{fmt(s.benchmark_return_pct)}</td>
                                <td className="px-3 py-2 text-right">{fmt(s.max_drawdown_pct)}</td>
                                <td className="px-3 py-2 text-right">${fmt(s.final_equity)}</td>
                                <td className={`px-3 py-2 text-right ${signClass(s.realized_pnl)}`}>${fmt(s.realized_pnl)}</td>
                                <td className={`px-3 py-2 text-right ${signClass(s.unrealized_pnl)}`}>${fmt(s.unrealized_pnl)}</td>
                                <td className="px-3 py-2 text-right">${fmt(s.fees_paid)}</td>
                                <td className="px-3 py-2 text-right">{fmt(s.win_rate_pct, 1)}</td>
                                <td className="px-3 py-2 text-right">{s.num_buys ?? "--"}</td>
                                <td className="px-3 py-2 text-right">{s.num_sells ?? "--"}</td>
                                <td className="px-3 py-2 text-right">{s.open_lots ?? "--"}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default RunComparisonTable
