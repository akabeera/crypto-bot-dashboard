// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import mongoClientPromise from '../../utils/mongodb'
import { normalizeSellOrderDoc } from '../../utils/normalize'
import { SellOrder } from '../../interfaces/sellOrder'

const tickersWhiteList = process.env.SUPPORTED_TICKERS || ""
const DEFAULT_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 30 * 2 // ~2 months

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SellOrder[] | { error: string }>,
) {
    try {
        const client = await mongoClientPromise
        const DB_NAME = process.env.DB_NAME || "crypto-bot"
        const COLLECTION_NAME = process.env.SELL_ORDERS_COLLECTION_NAME || "sell_orders"
        const db = client.db(DB_NAME)
        const collection = db.collection(COLLECTION_NAME)

        // ?days=N overrides the default 2-month lookback; ?days=0 disables it
        const days = req.query.days ? Number(req.query.days) : null
        const lookbackMs = days !== null && Number.isFinite(days)
            ? days * 24 * 60 * 60 * 1000
            : DEFAULT_LOOKBACK_MS

        const conditions: any[] = []
        if (lookbackMs > 0) {
            conditions.push({ "sell_order.timestamp": { $gte: Date.now() - lookbackMs } })
        }

        const tickersList = tickersWhiteList.length > 0
            ? tickersWhiteList.split(",").map(t => `${t.trim().toUpperCase()}/USD`)
            : []
        if (tickersList.length > 0) {
            conditions.push({ "sell_order.symbol": { $in: tickersList } })
        }

        const query = conditions.length > 0 ? { $and: conditions } : {}
        const documents = await collection
            .find(query)
            .sort({ "sell_order.timestamp": 1 })
            .toArray();

        const normalized = documents
            .map(normalizeSellOrderDoc)
            .filter((d): d is SellOrder => d !== null)

        res.status(200).json(normalized);
      } catch (error) {
        res.status(500).json({ error: `error fetching sell orders: ${error}` });
      }
}
