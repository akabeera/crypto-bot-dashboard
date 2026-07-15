// Shared display formatting for the dashboard and backtest pages.

export function usd(n: number | null | undefined, digits = 2): string {
    if (n === null || n === undefined || !Number.isFinite(n)) return "--"
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// Plain number with fixed digits; "--" for missing/non-finite values
// (e.g. legacy run_*.json summaries without a field).
export function fmt(n: number | null | undefined, digits = 2): string {
    return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "--"
}

// P&L coloring: green for gains, red for losses, `zeroClass` otherwise.
export function signClass(n: number | null | undefined, zeroClass = ""): string {
    if (typeof n !== "number" || !Number.isFinite(n) || n === 0) return zeroClass
    return n > 0 ? "text-green-500" : "text-red-400"
}

// Backtest run stamp YYYYMMDD_HHMMSS -> "YYYY-MM-DD HH:MM[:SS]"
export function fmtStamp(stamp: string, withSeconds = false): string {
    const base = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(9, 11)}:${stamp.slice(11, 13)}`
    return withSeconds ? `${base}:${stamp.slice(13, 15)}` : base
}
