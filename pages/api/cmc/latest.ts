// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import { CMC_URL } from "../../../utils/constants"

if (!process.env.CMC_API_KEY) {
    throw new Error('env var for mcm api key missing');
}
const apiKey = process.env.CMC_API_KEY

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | { error: string }>,
) {
    const path = "/cryptocurrency/quotes/latest"
    const { symbol } = req.query; 

    try {
        const url = `${CMC_URL}${path}?symbol=${symbol}`
        const response = await fetch(url, {

            method: 'GET', // or 'POST'
            headers: {
              // Headers if required by the external API
              'Content-Type': 'application/json',
              'X-CMC_PRO_API_KEY': apiKey
            },
          });
      
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
      
          const data = await response.json();
      
          // Send the data back to the client
          res.status(200).json(data);
      } catch (error) {
        res.status(500).json({ error: `error fetching current holders: ${error}` });
      } 
}
