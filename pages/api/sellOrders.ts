// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import mongoClientPromise from '../../utils/mongodb'
import { BuyOrder } from '../../interfaces/buyOrder'

const tickersWhiteList = process.env.SUPPORTED_TICKERS || ""
const timeOffSet = 1000 * 60 * 60 * 24 * 30 * 2

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BuyOrder[] | { error: string }>,
) {
    const client = await mongoClientPromise
    try {
        const DB_NAME = process.env.DB_NAME || "crypto-bot"
        const COLLECTION_NAME = process.env.SELL_ORDERS_COLLECTION_NAME || "sell_orders"
        const db = client.db(DB_NAME)
        const collection = db.collection<BuyOrder>(COLLECTION_NAME)

        const tickersList = tickersWhiteList && tickersWhiteList.length > 0 ? tickersWhiteList.split(",").map(t => `${t.toUpperCase()}/USD`) : []
        const since = Date.now() - timeOffSet
        const query = tickersList.length > 0 ? { 
            $and: [
                { "sell_order.symbol": {$in: tickersList} },
                { "sell_order.timestamp": {$gte: since}}
            ]
        } : {}
        
        const documents = await collection.find(query).toArray();
        res.status(200).json(documents);
      } catch (error) {
        res.status(500).json({ error: `error fetching current holders: ${error}` });
      } 
}
