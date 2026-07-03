import type { NextApiRequest, NextApiResponse } from "next"
import { fetchQuotes, TickerQuote } from "../../utils/exchange"

// Current market quotes straight from the exchange the bot trades on
// (ccxt/coinbase), replacing the old CoinMarketCap route. Symbols are full
// ticker pairs: /api/prices?symbols=BTC/USD,SOL/USD

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Record<string, TickerQuote> | { error: string }>,
) {
    const { symbols } = req.query
    if (!symbols || typeof symbols !== "string") {
        res.status(400).json({ error: "missing 'symbols' query param (comma-separated ticker pairs)" })
        return
    }

    const symbolList = symbols.split(",").map(s => s.trim()).filter(s => s.length > 0)
    if (symbolList.length === 0) {
        res.status(400).json({ error: "no symbols provided" })
        return
    }

    try {
        const quotes = await fetchQuotes(symbolList)
        res.status(200).json(quotes)
    } catch (error) {
        res.status(500).json({ error: `error fetching quotes: ${error}` })
    }
}
