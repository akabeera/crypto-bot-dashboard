import type { NextApiRequest, NextApiResponse } from "next"
import { listRuns, RunSummaryInfo } from "../../../utils/backtest"

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RunSummaryInfo[] | { error: string }>,
) {
    try {
        res.status(200).json(listRuns())
    } catch (error) {
        res.status(500).json({ error: `error listing backtest runs: ${error}` })
    }
}
