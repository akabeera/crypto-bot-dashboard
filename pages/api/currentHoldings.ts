// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import mongoClientPromise from '../../utils/mongodb'
import { normalizeOrder } from '../../utils/normalize'
import { BuyOrder } from '../../interfaces/buyOrder'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BuyOrder[] | { error: string }>,
) {
    const { ticker } = req.query; // optional base ticker filter, e.g. ?ticker=BTC

    try {
        const client = await mongoClientPromise
        const DB_NAME = process.env.DB_NAME || "crypto-bot"
        const COLLECTION_NAME = process.env.TRADES_COLLECTION_NAME || "trades"
        const db = client.db(DB_NAME)
        const collection = db.collection(COLLECTION_NAME)

        // Lots are stored with the full ccxt pair in `symbol` (e.g. "BTC/USD")
        const query = ticker
            ? { symbol: { $regex: `^${(ticker as string).toUpperCase()}/` } }
            : {}
        // Drop the raw Coinbase `info` blob and fill list — the client only
        // needs the normalized ccxt fields, and `info` dominates payload size
        const documents = await collection
            .find(query)
            .project({ info: 0, trades: 0 })
            .sort({ symbol: 1, timestamp: 1 })
            .toArray();

        res.status(200).json(documents.map(normalizeOrder));
      } catch (error) {
        res.status(500).json({ error: `error fetching current holdings: ${error}` });
      }
}
