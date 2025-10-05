import React, { useState, useEffect } from "react"

import { SellOrder } from "@/interfaces/sellOrder";
import { Dictionary } from "@/interfaces/dictionary";

import CurrentHoldings from "@/components/CurrentHoldings"
import ScatterChart from "@/components/ScatterChart"
import ProfitsLineChart from "@/components/ProfitsLineChart"

export default function Home() {

  const [tickerLists, setTickerLists] = useState<string[]>()
  const [tickersSellOrders, setTickersSellOrders] = useState<Dictionary<SellOrder[]>>()

  useEffect(() => {
    async function asyncFetchSellOrders() {
        const sellOrderResponse = await fetch(`api/sellOrders`)
        const SellOrderResponseJson = await sellOrderResponse.json()

        const newTickerSellOrders: Dictionary<SellOrder[]> = {}
        const allTickerPairs: string[] = []
        SellOrderResponseJson.forEach((sellOrder:SellOrder) => {
            const tickerPair = sellOrder.sell_order.symbol

            if (tickerPair in newTickerSellOrders) {
                newTickerSellOrders[sellOrder.sell_order.symbol].push(sellOrder)
            } else {
                allTickerPairs.push(tickerPair)
                newTickerSellOrders[sellOrder.sell_order.symbol] = [sellOrder]
            }
        })
        
        setTickerLists(allTickerPairs)
        setTickersSellOrders(newTickerSellOrders)
    }

    asyncFetchSellOrders()    
  }, [])

  return (
    
    <main className="flex flex-row bg-white dark:bg-black">
      <div className="flex-grow"></div>

      <div className="flex flex-col justify-between p-4">
        <div className="items-center justify-between font-mono">
          <p className="flex text-3xl pb-6 pt-8 justify-center border-b border-gray-300  dark:border-neutral-800 dark:bg-zinc-800/30 from-inherit dark:text-white text-black">
            Crypto-Bot Performance Dashboard
          </p>
        </div>

        <div>
          <div>
            <CurrentHoldings/>
          </div>
          <div>
            <ScatterChart title="Historical Performance" tickerLists={tickerLists} tickersSellOrders={tickersSellOrders} />
          </div>
          <div>
            <ProfitsLineChart title="Profits Over Time" tickerLists={tickerLists} tickersSellOrders={tickersSellOrders} />
          </div>
        </div>
      </div>

      <div className="flex-grow"></div>

    </main>
  );
}
