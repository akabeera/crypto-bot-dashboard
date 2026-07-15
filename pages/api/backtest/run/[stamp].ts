import type { NextApiRequest, NextApiResponse } from "next"
import fs from "fs"
import path from "path"
import {
    STAMP_PATTERN, resultsDir, readEquity, readTrades, downsample,
    EquityPoint, BacktestTrade,
} from "../../../../utils/backtest"

export interface RunDetail {
    stamp: string
    run: any | null
    equity: EquityPoint[]
    trades: BacktestTrade[]
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RunDetail | { error: string }>,
) {
    const { stamp } = req.query
    if (typeof stamp !== "string" || !STAMP_PATTERN.test(stamp)) {
        res.status(400).json({ error: "invalid run stamp" })
        return
    }

    try {
        const runJsonPath = path.join(resultsDir(), `run_${stamp}.json`)
        let run = null
        if (fs.existsSync(runJsonPath)) {
            run = JSON.parse(fs.readFileSync(runJsonPath, "utf-8"))
        }

        const equity = downsample(readEquity(stamp))
        const trades = readTrades(stamp)
        if (equity.length === 0 && trades.length === 0 && run === null) {
            res.status(404).json({ error: `no results found for run ${stamp}` })
            return
        }

        res.status(200).json({ stamp, run, equity, trades })
    } catch (error) {
        res.status(500).json({ error: `error reading backtest run: ${error}` })
    }
}
