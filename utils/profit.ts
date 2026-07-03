// Fee-aware profit math, mirroring crypto_bot/utils/trading.py.
//
// calculate_profit_percent (bot):
//   profit            = (bid - price) * shares
//   fee_rate          = buy_fee / cost
//   estimated_sell_fee = bid * shares * fee_rate
//   profit_after_fees% = (profit - buy_fee - estimated_sell_fee) / cost
//
// `cost` is the ccxt order cost (USD spent excluding the buy fee), matching
// the bot's position documents.

export interface PositionLike {
    price: number
    shares: number
    cost: number
    fee: number
}

export function profitPercent(position: PositionLike, bid: number): number | null {
    const { price, shares, cost, fee } = position
    if (!bid || cost <= 0) {
        return null
    }
    const profit = (bid - price) * shares
    const feeRate = fee / cost
    const estimatedSellFee = bid * shares * feeRate
    return ((profit - fee - estimatedSellFee) / cost) * 100
}

// ---- realized P&L from sell_orders documents ----

import type { SellOrder } from "../interfaces/sellOrder"

// Proceeds of a sell, matching the bot's settlement logic: prefer the
// exchange-reported total_value_after_fees, fall back to cost - fee.
export function sellProceeds(sellOrder: SellOrder): number {
    const so = sellOrder.sell_order
    const tvaf = Number(so.info?.total_value_after_fees)
    if (Number.isFinite(tvaf) && tvaf > 0) {
        return tvaf
    }
    return so.cost - so.fee.cost
}

// What the closed lots originally cost, incl. their buy fees.
export function sellCostBasis(sellOrder: SellOrder): number {
    return sellOrder.closed_positions.reduce((sum, cp) => sum + cp.cost + cp.fee.cost, 0)
}

export function realizedPnl(sellOrder: SellOrder): number {
    return sellProceeds(sellOrder) - sellCostBasis(sellOrder)
}
