import { Order, OrderFee } from "../interfaces/orders"
import { SellOrder } from "../interfaces/sellOrder"

// The bot stores raw ccxt order dicts in MongoDB, and numeric fields come
// back inconsistently typed: fee.cost is a string in most documents
// (Coinbase returns strings, ccxt sometimes passes them through). All API
// routes normalize documents here so the client only ever sees numbers.

export function toNum(value: unknown, fallback = 0): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : fallback
    }
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value)
        return Number.isFinite(n) ? n : fallback
    }
    return fallback
}

function normalizeFee(fee: any): OrderFee {
    return {
        cost: toNum(fee?.cost),
        currency: fee?.currency ?? null,
    }
}

export function normalizeOrder(doc: any): Order {
    return {
        ...doc,
        timestamp: toNum(doc?.timestamp),
        price: toNum(doc?.price),
        amount: toNum(doc?.amount),
        filled: toNum(doc?.filled),
        remaining: toNum(doc?.remaining),
        cost: toNum(doc?.cost),
        average: toNum(doc?.average, toNum(doc?.price)),
        fee: normalizeFee(doc?.fee),
        fees: Array.isArray(doc?.fees) ? doc.fees.map(normalizeFee) : [],
        symbol: doc?.symbol ?? "",
    }
}

export function normalizeSellOrderDoc(doc: any): SellOrder | null {
    if (!doc || !doc.sell_order) {
        return null
    }
    return {
        sell_order: normalizeOrder(doc.sell_order),
        closed_positions: Array.isArray(doc.closed_positions)
            ? doc.closed_positions.map(normalizeOrder)
            : [],
    }
}
