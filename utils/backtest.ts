import fs from 'fs'
import path from 'path'

// Reads backtest output from the crypto_bot repo. Formats are documented in
// crypto_bot/backtest/RESULTS_FORMAT.md: every run writes trades_<stamp>.csv,
// equity_<stamp>.csv and (since 2026-07-03) run_<stamp>.json, keyed by a
// shared local-time stamp YYYYMMDD_HHMMSS. Candles the backtester used are
// cached as <BASE>_<QUOTE>_<timeframe>.csv in backtest/data.

const DEFAULT_BOT_REPO = path.resolve(process.cwd(), '..', 'crypto_bot')

export function resultsDir(): string {
    return process.env.BACKTEST_RESULTS_DIR || path.join(DEFAULT_BOT_REPO, 'backtest', 'results')
}

export function candlesDir(): string {
    return process.env.BACKTEST_DATA_DIR || path.join(DEFAULT_BOT_REPO, 'backtest', 'data')
}

export const STAMP_PATTERN = /^\d{8}_\d{6}$/

export interface RunSummaryInfo {
    stamp: string
    hasRunJson: boolean
    config_file?: string
    cli_overrides?: string[]
    args?: any
    summary?: any
}

export interface EquityPoint {
    time: number
    equity: number
    cash: number
    banked: number
    position_value: number
}

export interface BacktestTrade {
    time: number
    ticker: string
    side: string
    reason: string
    price: number
    shares: number
    cost_basis: number
    proceeds: number
    fee: number
    pnl: number
    pnl_percent: number
    hold_hours: number
}

// Naive split — no quoting support. Safe because the backtester only writes
// numeric fields and enum-like slugs (see RESULTS_FORMAT.md: `reason` is
// strategy_buy/take_profit/...), never free text that could contain commas.
function parseCsv(filePath: string): Record<string, string>[] {
    const text = fs.readFileSync(filePath, 'utf-8').trim()
    if (!text) {
        return []
    }
    const lines = text.split(/\r?\n/)
    const headers = lines[0].split(',')
    return lines.slice(1).map(line => {
        const values = line.split(',')
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = values[i] })
        return row
    })
}

export function listRuns(): RunSummaryInfo[] {
    const dir = resultsDir()
    if (!fs.existsSync(dir)) {
        return []
    }

    const stamps = new Set<string>()
    for (const file of fs.readdirSync(dir)) {
        const m = file.match(/^(?:equity|trades|run)_(\d{8}_\d{6})\.(?:csv|json)$/)
        if (m) {
            stamps.add(m[1])
        }
    }

    const runs: RunSummaryInfo[] = []
    for (const stamp of Array.from(stamps).sort().reverse()) {
        const runJsonPath = path.join(dir, `run_${stamp}.json`)
        if (fs.existsSync(runJsonPath)) {
            try {
                const run = JSON.parse(fs.readFileSync(runJsonPath, 'utf-8'))
                runs.push({
                    stamp,
                    hasRunJson: true,
                    config_file: run.config_file,
                    cli_overrides: run.cli_overrides,
                    args: run.args,
                    summary: run.summary,
                })
                continue
            } catch {
                // fall through: treat as legacy if the json is unreadable
            }
        }
        runs.push({ stamp, hasRunJson: false })
    }
    return runs
}

export function readEquity(stamp: string): EquityPoint[] {
    const filePath = path.join(resultsDir(), `equity_${stamp}.csv`)
    if (!fs.existsSync(filePath)) {
        return []
    }
    return parseCsv(filePath).map(row => ({
        time: Number(row.time),
        equity: Number(row.equity),
        cash: Number(row.cash),
        banked: Number(row.banked),
        position_value: Number(row.position_value),
    }))
}

export function readTrades(stamp: string): BacktestTrade[] {
    const filePath = path.join(resultsDir(), `trades_${stamp}.csv`)
    if (!fs.existsSync(filePath)) {
        return []
    }
    return parseCsv(filePath).map(row => ({
        time: Number(row.time),
        ticker: row.ticker,
        side: row.side,
        reason: row.reason,
        price: Number(row.price),
        shares: Number(row.shares),
        cost_basis: Number(row.cost_basis),
        proceeds: Number(row.proceeds),
        fee: Number(row.fee),
        pnl: Number(row.pnl),
        pnl_percent: Number(row.pnl_percent),
        hold_hours: Number(row.hold_hours),
    }))
}

export interface CandlePoint {
    time: number
    close: number
}

export function readCandles(ticker: string, timeframe: string, fromMs?: number, toMs?: number): CandlePoint[] | null {
    // "BTC/USD" + "1h" -> BTC_USD_1h.csv; the replace also blocks path
    // traversal (both params come straight from the query string)
    const fileName = `${`${ticker}_${timeframe}`.replace(/[^A-Za-z0-9]/g, '_')}.csv`
    const filePath = path.join(candlesDir(), fileName)
    if (!fs.existsSync(filePath)) {
        return null
    }
    let candles = parseCsv(filePath).map(row => ({
        time: Number(row.time),
        close: Number(row.close),
    }))
    if (fromMs) {
        candles = candles.filter(c => c.time >= fromMs)
    }
    if (toMs) {
        candles = candles.filter(c => c.time <= toMs)
    }
    return candles
}

// Charts don't need more than ~2000 points; stride-sample keeping endpoints.
export function downsample<T>(points: T[], maxPoints = 2000): T[] {
    if (points.length <= maxPoints) {
        return points
    }
    const stride = Math.ceil(points.length / maxPoints)
    const sampled = points.filter((_, i) => i % stride === 0)
    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
        sampled.push(points[points.length - 1])
    }
    return sampled
}
