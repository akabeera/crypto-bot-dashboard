import React, { useState, useEffect, useRef } from "react"
import Chart from 'chart.js/auto'
import { SellOrder } from "@/interfaces/sellOrder";
import { Dictionary } from "@/interfaces/dictionary";
import { SCATTER_PLOT_STYLES } from "@/utils/constants";

interface DataPoint {
    x: number,
    y: number
}

interface Dataset {
    label: string,
    data: DataPoint[],
    backgroundColor: string,
    pointStyle: string
}

interface ChartTicker {
    tickerPair: string,
    visible: boolean,
    idx: number
}

type Props = {
    title: string,
    tickerLists: string[] | undefined,
    tickersSellOrders: Dictionary<SellOrder[]> | undefined
}

const ScatterChart = ({title, tickerLists, tickersSellOrders}: Props) => {
    const [chartInstance, setChartInstance] = useState<Chart | null>(null)
    const [chartTickersList, setChartTickersList] = useState<ChartTicker[]>([])

    useEffect(() => {
        if (!tickerLists || tickerLists.length == 0){
            return
        }

        const scatter_plot_styles_length = SCATTER_PLOT_STYLES.length
        const chartTickers: ChartTicker[] = []
        tickerLists.forEach((tickerPair, idx:number) => {
            const chartTicker: ChartTicker = {
                tickerPair: tickerPair,
                visible: idx < scatter_plot_styles_length,
                idx: idx
            }
            chartTickers.push(chartTicker)
        })
       
        setChartTickersList(chartTickers)

    }, [tickerLists])

    useEffect(() => {
        if (!chartTickersList || chartTickersList.length === 0 || !tickersSellOrders)
            return
        const canvas = document.getElementById('scatterplot') as HTMLCanvasElement
        if (!canvas) {
            return
        }

        // Destroy the existing chart instance if it exists
        if (chartInstance){
            chartInstance.destroy();
        }
        const datasets: Dataset[] = []
        const scatter_plot_styles_length = SCATTER_PLOT_STYLES.length
        for (let idx=0; idx<chartTickersList.length; ++idx) {
            const chartTicker = chartTickersList[idx]
        
            if (!chartTicker.visible) {
                continue
            }

            const scatterPlotStyle = SCATTER_PLOT_STYLES[idx % scatter_plot_styles_length]
            const tickerDataset: Dataset = {
                label: chartTicker.tickerPair,
                data: [],
                backgroundColor: scatterPlotStyle.backgroundColor,
                pointStyle: scatterPlotStyle.pointStyle
            }
            
            const sellOrders = tickersSellOrders[chartTicker.tickerPair]
            sellOrders.forEach((sellOrder) => {
                const so = sellOrder.sell_order
                const sellTimestamp = so.timestamp

                const closedPositions = sellOrder.closed_positions
                closedPositions.forEach(cp => {
                    const timeTakenToSell = (sellTimestamp - cp.timestamp)/(1000 * 60 * 60)
                    tickerDataset.data.push({x: sellTimestamp, y:timeTakenToSell})
                })
            })
            datasets.push(tickerDataset)
        }
        
        const data = {
            datasets: datasets.map((ds) =>  {
                return {
                    label: ds.label,
                    backgroundColor: ds.backgroundColor,
                    data: ds.data.map(pts => { return {x: pts.x, y: pts.y}}),
                    pointStyle: ds.pointStyle,
                    radius: 5
                }
            })
        }
        const newChartInstance = new Chart(canvas, {
                type: 'scatter',
                data: data,
                options: {
                
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom'
                    },
                    y: {
                        type: 'logarithmic'
                    }
                }
            }
        })
    
        setChartInstance(newChartInstance)

        return () => {
            newChartInstance.destroy()
        }

    }, [chartTickersList])

    function onTickerSelection(idx: number) {
        const updartedChartTickersList: ChartTicker[] = JSON.parse(JSON.stringify(chartTickersList))
        updartedChartTickersList[idx].visible = !updartedChartTickersList[idx].visible

        setChartTickersList(updartedChartTickersList)
    }


    return (
        <div className={`flex flex-col p-4`}>
            <div className="pb-4">
                <p className="text-3xl font-bold">{title}</p>
            </div>
            {true && 
                <div className="flex flex-wrap pl-4 mb-4 max-w-6xl">
                    {chartTickersList.map((ct, idx) => 
                        <div key={idx}className={`p-2 mr-2 mb-2 rounded-xl hover: cursor-pointer ${ct.visible ? "bg-green-800": "bg-neutral-700"}`} onClick={() => onTickerSelection(ct.idx)}>
                            <div className="text-xs ">{ct.tickerPair}</div>
                        </div>
                    )}
                </div>
            }

            <div className="border border-gray-400 pt-0 rounded-xl">
                <canvas id="scatterplot"></canvas>
            </div>
        </div>
    )
}

export default ScatterChart