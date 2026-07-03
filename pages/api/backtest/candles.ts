import type { NextApiRequest, NextApiResponse } from "next"
import { readCandles, downsample, CandlePoint } from "../../../utils/backtest"

// Historical closes from the backtester's own candle cache
// (crypto_bot/backtest/data), so the price a chart shows is exactly the
// price the backtest traded against.

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<CandlePoint[] | { error: string }>,
) {
    const { ticker, timeframe, from, to } = req.query
    if (typeof ticker !== "string" || ticker.length === 0) {
        res.status(400).json({ error: "missing 'ticker' query param (e.g. BTC/USD)" })
        return
    }

    const tf = typeof timeframe === "string" && timeframe.length > 0 ? timeframe : "1h"
    const fromMs = typeof from === "string" ? Number(from) : undefined
    const toMs = typeof to === "string" ? Number(to) : undefined

    try {
        const candles = readCandles(ticker, tf, fromMs, toMs)
        if (candles === null) {
            res.status(404).json({ error: `no cached candles for ${ticker} ${tf}` })
            return
        }
        res.status(200).json(downsample(candles))
    } catch (error) {
        res.status(500).json({ error: `error reading candles: ${error}` })
    }
}
