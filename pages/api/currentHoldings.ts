// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import mongoClientPromise from '../../utils/mongodb'
import { BuyOrder } from '../../interfaces/buyOrder'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BuyOrder[] | { error: string }>,
) {
    const { ticker } = req.query; // Access the ticker query parameter

    const client = await mongoClientPromise
    try {
        const DB_NAME = process.env.DB_NAME || "crypto-bot"
        const COLLECTION_NAME = process.env.DB_COLLECTION_NAME || "trades"
        const db = client.db(DB_NAME)
        const collection = db.collection<BuyOrder>(COLLECTION_NAME)

        const query = ticker ? { ticker: (ticker as string).toUpperCase() } : {}
        const documents = await collection.find(query).toArray();

        res.status(200).json(documents);
      } catch (error) {
        res.status(500).json({ error: `error fetching current holders: ${error}` });
      } 
}
