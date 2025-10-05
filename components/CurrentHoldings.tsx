import React, { useState, useEffect } from "react"
import { Inter } from "next/font/google"
import { BuyOrder } from "../interfaces/buyOrder"
import { Dictionary } from "../interfaces/dictionary"
import { HEADER, MAX_PRECISION, MIN_PRECISION } from "../utils/constants"
import { formatDate } from "../utils/dates"

const inter = Inter({ subsets: ["latin"] })

interface AvgPosition {
    ticker: string,
    shares: number,
    avgPrice: number,
    fees: number,
    cost: number, 
    profit: number,
    numberLots: number
}

interface Holdings {
    ticker: string,
    individualLots: BuyOrder[]
    currentPrice: number
}

const CurrentHoldings = () => {

    const [holdings, setHoldings] = useState<Dictionary<Holdings>>()
    const [holdingsDisplayState, setHoldingsDisplayState] = useState<Dictionary<boolean>>()
    const [avgPositions, setAvgPositions] = useState<AvgPosition[]>([])

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [marketValue, setMarketValue] = useState<number>(0)
    const [totalCost, setTotalCost] = useState<number>(0)
    const [totalPerformance, setTotalPerformance] = useState<number>(0)
    const currency = "USD"

    useEffect(() => {
        async function loadHoldings() {
            setIsLoading(true)
            const response = await fetch('/api/currentHoldings')
            const data = await response.json()

            const tempAvgPositions: Dictionary<AvgPosition> = {}
            const tempHoldings: Dictionary<Holdings> = {}
            const tempHoldingsDisplayState: Dictionary<boolean> = {}
            
            const allTickerPairs: string[] = []
            data.forEach((lot: BuyOrder) => {
                const current_ticker = lot.symbol
                const filled = lot.filled
                const price = lot.price
                const fee = Number(lot.fee.cost)
                if (current_ticker in tempAvgPositions) {
                    tempHoldings[current_ticker].individualLots.push(lot)
                    const avgPosition: AvgPosition = tempAvgPositions[current_ticker]
                    const currentAvgPrice = avgPosition.avgPrice
                    const currentAvgShares = avgPosition.shares
     
                    avgPosition.avgPrice = ((filled * price) + (currentAvgPrice * currentAvgShares))/(currentAvgShares + filled)
                    avgPosition.shares += filled
                    avgPosition.fees += fee
                    avgPosition.cost += (price * filled) + fee
                    avgPosition.numberLots += 1
                } else {
                    allTickerPairs.push(current_ticker)
                    const holding = {
                        ticker: current_ticker,
                        individualLots: [lot],
                        currentPrice: 0
                    }
                    tempHoldings[current_ticker] = holding
                    tempHoldingsDisplayState[current_ticker] = true

                    const avgPosition: AvgPosition = {
                        ticker: current_ticker,
                        shares: filled,
                        avgPrice: price,
                        fees: fee,
                        cost: (price * filled) + fee,
                        profit: 0,
                        numberLots: 1
                    } 
                    tempAvgPositions[current_ticker] = avgPosition
                }
            })

            const tickersList = allTickerPairs.map(tickerPair => tickerPair.split("/")[0])
            const tickerQuery = tickersList.join(",")

            const tickerLatestDataResponse = await fetch(`/api/cmc/latest?symbol=${tickerQuery}`)
            const tickerLatestDataResponseJson = await tickerLatestDataResponse.json()
            const status = tickerLatestDataResponseJson.status
            
            let marketValue = 0
            let cost = 0

            if (status.error_code === 0) {
                const latestTickersData = tickerLatestDataResponseJson.data
                for(let t=0; t<allTickerPairs.length; ++t) {
                    const tickerPair = allTickerPairs[t]
                    const ticker = tickerPair.split("/")[0]
                    if (!(ticker in latestTickersData)) {
                        console.log(`missing latest data for ${ticker}`)
                        continue
                    }
                    
                    const latestTickerData = latestTickersData[ticker]
                    if (latestTickerData.length === 0) {
                        console.log(`empty data returned for ${ticker}`)
                        continue
                    }
                    const latestPrice = latestTickerData[0]["quote"][currency]["price"]
                    
                    tempHoldings[tickerPair].currentPrice = latestPrice
                    
                    const avgPosition = tempAvgPositions[tickerPair]
                    const profit = (latestPrice - avgPosition.avgPrice) * avgPosition.shares
                    const avgCost = avgPosition.avgPrice * avgPosition.shares
                    avgPosition.profit = ((profit - (avgPosition.fees * 2)) / avgCost) * 100

                    const individualLots = tempHoldings[tickerPair].individualLots
                    individualLots.forEach((lot) => {
                        const lotProfit = (latestPrice - lot.price) * lot.filled
                        const lotCost = lot.price * lot.filled
                        const lotFee = lot.fee.cost * 2
                        lot.profit = ((lotProfit - lotFee) / lotCost) * 100
                    })

                    marketValue += latestPrice * avgPosition.shares
                    cost += avgCost + avgPosition.fees
                }
                
            } else {
                console.warn(`error occured fetch latest ticker prices: ${status.error_message}`)
            }

            const avgPositions: AvgPosition[] = []
            allTickerPairs.forEach((tickerPair) =>  {
                avgPositions.push(tempAvgPositions[tickerPair])
            })

            setHoldings(tempHoldings)
            setHoldingsDisplayState(tempHoldingsDisplayState)
            setAvgPositions(avgPositions)
            setTotalCost(cost)
            setMarketValue(marketValue)
            setTotalPerformance((marketValue - cost)/cost * 100)
            setIsLoading(false)
        }

        loadHoldings()
    }, [])

    function onHoldingsRowClick(tickerPair: string) {
        console.log(`clicking row: ${tickerPair}`)
        if (!holdingsDisplayState || !(tickerPair in holdingsDisplayState)) {
            return
        }
        const tempDisplayState = {...holdingsDisplayState}
        tempDisplayState[tickerPair] = !tempDisplayState[tickerPair]        
        setHoldingsDisplayState(tempDisplayState)
    }

    return (
        <div className={`flex flex-col p-4`}>
            <div className="pb-4">
                <p className="text-3xl font-bold">Current Performance</p>
            </div>
            <div className="flex gap-4 pb-2 text-2xl font-bold">
                <div className="flex-none min-w-32 w-44">{HEADER.SYMBOL}</div>
                <div className="min-w-44 w-44">{HEADER.SHARES}</div>
                <div className="min-w-44 w-44">{HEADER.PRICE}</div>
                <div className="min-w-44 w-44">{HEADER.FEES}</div>
                <div className="min-w-32 w-32">{HEADER.COST}</div>
                <div className="min-w-44 w-44">{HEADER.PROFIT}</div>
                <div className="min-w-44 w-44">{HEADER.NUM_LOTS}</div>
            </div>

            <div className="pb-4">
                {avgPositions.map( (avgPosition: AvgPosition, index) => (
                    <div key={index}>
                        <div
                            onClick={() => onHoldingsRowClick(avgPosition.ticker)} 
                            className={`flex gap-4 pb-2 text-xl cursor-pointer ${avgPosition.profit < 0 ? 'text-red-700 hover:bg-red-300 hover:font-bold': 'text-green-700 hover:bg-green-300 hover:font-bold'}`}>
                            <div className="flex-none min-w-32 w-44">{avgPosition.ticker}</div>
                            <div className="min-w-44 w-44">{avgPosition.shares.toFixed(MAX_PRECISION)}</div>
                            <div className="min-w-44 w-44">${avgPosition.avgPrice.toFixed(MAX_PRECISION)}</div>
                            <div className="min-w-44 w-44">${avgPosition.fees.toFixed(MAX_PRECISION)}</div>
                            <div className="min-w-32 w-32">${avgPosition.cost.toFixed(MIN_PRECISION)}</div>
                            <div className="min-w-44 w-44">{avgPosition.profit.toFixed(MAX_PRECISION)}%</div>
                            <div className="min-w-44 w-44">{avgPosition.numberLots}</div>

                        </div>
                        {holdings && avgPosition.ticker in holdings && holdingsDisplayState && !(holdingsDisplayState[avgPosition.ticker]) && (   
                            holdings[avgPosition.ticker].individualLots.map((lot: BuyOrder, idx:number) => (
                                <div key={idx} className={`flex gap-4 pl-4 pb-4 text-sm bg-slate-900 ${lot.profit && lot.profit < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    <div className="flex-none min-w-32 w-44">{ formatDate(lot.timestamp) }</div>
                                    <div className="m-w-44 w-44">{lot.filled.toFixed(MAX_PRECISION)}</div>
                                    <div className="min-w-44 w-44">${lot.price.toFixed(MAX_PRECISION)}</div>
                                    <div className="min-w-44 w-44">${lot.fee.cost.toFixed(MAX_PRECISION)}</div>
                                    <div className="min-w-32 w-32">${(lot.cost + lot.fee.cost).toFixed(MIN_PRECISION)}</div>
                                    <div className="min-w-40 w-44">{lot.profit ? `${lot.profit.toFixed(MAX_PRECISION)}%` : "--"}</div>
                                </div>
                            ))
                        )}
                    </div>
                ))}
            </div>

            <div>
                <div className="pb-4">
                    <div className="flex gap-4 text-2xl font-bold pb-4">
                        <div className="w-72">MARKET VALUE:</div>
                        <div>${marketValue.toFixed(MAX_PRECISION)}</div>
                    </div>

                    <div className="flex gap-4 text-2xl font-bold pb-4">
                        <div className="w-72">TOTAL COST:</div>
                        <div>${totalCost.toFixed(MAX_PRECISION)}</div>
                    </div>
                    <div className="flex gap-4 text-2xl font-bold pb-4">
                        <div className="w-72">TOTAL PERFORMANCE:</div>
                        <div className={`${totalPerformance < 0 ? 'text-red-700': 'text-green-700'}`}>{totalPerformance.toFixed(2)}%</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CurrentHoldings