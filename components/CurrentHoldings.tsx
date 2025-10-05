import React, { useState, useEffect } from "react"
import { BuyOrder } from "../interfaces/buyOrder"
import { Dictionary } from "../interfaces/dictionary"
import { HEADER, MAX_PRECISION, MIN_PRECISION } from "../utils/constants"
import { formatDate } from "../utils/dates"

interface AvgPosition {
    ticker: string,
    shares: number,
    avgPrice: number,
    fees: number,
    cost: number,
    profit: number,
    profitBeforeSellFee: number,
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
                lot.fee.cost = Number(lot.fee.cost)
                if (current_ticker in tempAvgPositions) {
                    tempHoldings[current_ticker].individualLots.push(lot)
                    const avgPosition: AvgPosition = tempAvgPositions[current_ticker]
                    const currentAvgPrice = avgPosition.avgPrice
                    const currentAvgShares = avgPosition.shares
     
                    avgPosition.avgPrice = ((filled * price) + (currentAvgPrice * currentAvgShares))/(currentAvgShares + filled)
                    avgPosition.shares += filled
                    avgPosition.fees += lot.fee.cost
                    avgPosition.cost += (price * filled) + lot.fee.cost
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
                        fees: lot.fee.cost,
                        cost: (price * filled) + lot.fee.cost,
                        profit: 0,
                        profitBeforeSellFee: 0,
                        numberLots: 1
                    }
                    tempAvgPositions[current_ticker] = avgPosition
                }
            })

            // Map legacy tickers to their current equivalents
            const tickerMapping: {[key: string]: string} = {
                'MATIC': 'POL'  // MATIC has been rebranded to POL
            };
            
            // Apply ticker mapping
            const mappedTickersList = allTickerPairs.map(tickerPair => {
                const ticker = tickerPair.split("/")[0]
                const mappedTicker = tickerMapping[ticker] || ticker
                return mappedTicker
            })
            const tickerQuery = mappedTickersList.join(",")

            const tickerLatestDataResponse = await fetch(`/api/cmc/latest?symbol=${tickerQuery}`)
            const tickerLatestDataResponseJson = await tickerLatestDataResponse.json()
            const status = tickerLatestDataResponseJson.status
            
            let marketValue = 0
            let cost = 0

            if (status.error_code === 0) {
                const latestTickersData = tickerLatestDataResponseJson.data
                
                for(let t=0; t<allTickerPairs.length; ++t) {
                    const tickerPair = allTickerPairs[t]
                    const originalTicker = tickerPair.split("/")[0]
                    const mappedTicker = tickerMapping[originalTicker] || originalTicker
                    
                    if (!(mappedTicker in latestTickersData)) {
                        console.log(`missing latest data for ${mappedTicker} (original: ${originalTicker})`)
                        continue
                    }
                    
                    const latestTickerData = latestTickersData[mappedTicker]
                    if (latestTickerData.length === 0) {
                        console.log(`empty data returned for ${mappedTicker}`)
                        continue
                    }
                    
                    const latestPrice = latestTickerData[0]["quote"][currency]["price"]
                    
                    // Handle null prices (inactive tokens)
                    if (latestPrice === null) {
                        console.log(`${mappedTicker} price is null (token may be inactive)`)
                        continue
                    }
                    
                    tempHoldings[tickerPair].currentPrice = latestPrice
                    
                    const avgPosition = tempAvgPositions[tickerPair]
                    const grossProfit = (latestPrice - avgPosition.avgPrice) * avgPosition.shares
                    const avgCostWithBuyFees = (avgPosition.avgPrice * avgPosition.shares) + avgPosition.fees
                    const netProfit = grossProfit - (avgPosition.fees * 2) // subtract both buy and sell fees
                    avgPosition.profit = (netProfit / avgCostWithBuyFees) * 100
                    avgPosition.profitBeforeSellFee = (grossProfit / avgCostWithBuyFees) * 100

                    const individualLots = tempHoldings[tickerPair].individualLots
                    individualLots.forEach((lot) => {
                        const grossProfit = (latestPrice - lot.price) * lot.filled
                        const lotCostWithBuyFee = (lot.price * lot.filled) + lot.fee.cost
                        const netProfit = grossProfit - (lot.fee.cost * 2) // subtract both buy and sell fees
                        lot.profit = (netProfit / lotCostWithBuyFee) * 100
                        lot.profitBeforeSellFee = (grossProfit / lotCostWithBuyFee) * 100
                    })

                    marketValue += latestPrice * avgPosition.shares
                    cost += avgCostWithBuyFees
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
        <div className="flex flex-col p-4">
            <div className="pb-4">
                <p className="text-3xl font-bold">Current Performance</p>
            </div>
            <div className="flex gap-4 pb-2 text-2xl font-bold">
                <div className="flex-none min-w-32 w-44">{HEADER.SYMBOL}</div>
                <div className="min-w-44 w-44">{HEADER.SHARES}</div>
                <div className="min-w-44 w-44">{HEADER.PRICE}</div>
                <div className="min-w-44 w-44">{HEADER.FEES}</div>
                <div className="min-w-32 w-32">{HEADER.COST}</div>
                <div className="min-w-44 w-44">PROFIT (w/ SELL FEE)</div>
                <div className="min-w-44 w-44">PROFIT (w/o SELL FEE)</div>
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
                            <div className="min-w-44 w-44">{avgPosition.profitBeforeSellFee.toFixed(MAX_PRECISION)}%</div>
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
                                    <div className="min-w-44 w-44">{lot.profit ? `${lot.profit.toFixed(MAX_PRECISION)}%` : "--"}</div>
                                    <div className="min-w-44 w-44">{lot.profitBeforeSellFee ? `${lot.profitBeforeSellFee.toFixed(MAX_PRECISION)}%` : "--"}</div>
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