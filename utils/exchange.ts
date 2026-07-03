import ccxt, { Exchange } from 'ccxt'

// Mirrors crypto_bot/utils/exchange_service.py: a singleton ccxt coinbase
// client so the dashboard prices positions off the same exchange feed the
// bot trades against. API_KEY/API_SECRET are the same credentials the bot
// uses; when absent we fall back to public (unauthenticated) market data.

const EXCHANGE_ID = process.env.EXCHANGE_ID || 'coinbase'

export interface TickerQuote {
    symbol: string
    bid: number | null
    ask: number | null
    last: number | null
    timestamp: number | null
}

function createExchange(): Exchange {
    const exchangeClass = (ccxt as any)[EXCHANGE_ID]
    if (!exchangeClass) {
        throw new Error(`unknown ccxt exchange id: ${EXCHANGE_ID}`)
    }

    const apiKey = process.env.API_KEY
    // The key is an EC private key stored with literal "\n" sequences,
    // exactly like the bot's .env (see exchange_service.py)
    const secret = process.env.API_SECRET?.replace(/\\n/g, '\n')

    if (apiKey && secret) {
        return new exchangeClass({ apiKey, secret })
    }
    return new exchangeClass({})
}

export function isAuthenticated(): boolean {
    return Boolean(process.env.API_KEY && process.env.API_SECRET)
}

// Cache across HMR reloads in dev, same pattern as utils/mongodb.ts
function getExchange(): Exchange {
    if (process.env.NODE_ENV === 'development') {
        if (!(global as any)._ccxtExchange) {
            (global as any)._ccxtExchange = createExchange()
        }
        return (global as any)._ccxtExchange
    }
    if (!exchangeInstance) {
        exchangeInstance = createExchange()
    }
    return exchangeInstance
}
let exchangeInstance: Exchange | null = null

function toQuote(symbol: string, t: any): TickerQuote {
    return {
        symbol,
        bid: t?.bid ?? null,
        ask: t?.ask ?? null,
        last: t?.last ?? null,
        timestamp: t?.timestamp ?? null,
    }
}

/**
 * Fetch current quotes for a list of ticker pairs (e.g. ["BTC/USD"]).
 * Authenticated: one batched fetchBidsAsks call (what the bot uses for DCS).
 * Public: per-symbol fetchTicker, the same call the bot's trade loop makes.
 */
export async function fetchQuotes(symbols: string[]): Promise<Record<string, TickerQuote>> {
    const exchange = getExchange()
    const quotes: Record<string, TickerQuote> = {}

    // Drop symbols the exchange no longer lists (e.g. delisted VGX/USD) —
    // ccxt raises BadSymbol for the entire batch otherwise. Callers see
    // which symbols came back and can flag the rest as unpriced.
    await exchange.loadMarkets()
    const listed = symbols.filter(s => s in exchange.markets && exchange.markets[s]?.active !== false)
    if (listed.length === 0) {
        return quotes
    }

    if (isAuthenticated()) {
        const tickers = await exchange.fetchBidsAsks(listed)
        for (const symbol of listed) {
            if (tickers[symbol]) {
                quotes[symbol] = toQuote(symbol, tickers[symbol])
            }
        }
        return quotes
    }

    const results = await Promise.allSettled(
        listed.map(async (symbol) => toQuote(symbol, await exchange.fetchTicker(symbol)))
    )
    results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            quotes[listed[i]] = r.value
        }
    })
    return quotes
}
