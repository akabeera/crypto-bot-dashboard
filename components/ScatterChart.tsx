import React, { useState, useEffect } from "react"
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

type Props = {
    title: string,
    tickerLists: string[] | undefined,
    tickersSellOrders: Dictionary<SellOrder[]> | undefined
}

const ScatterChart = ({title, tickerLists, tickersSellOrders}: Props) => {
    const [chartInstance, setChartInstance] = useState<Chart | null>(null);

    useEffect(() => {
        if (!tickerLists || !tickersSellOrders || tickerLists.length == 0 || !tickersSellOrders){
            return
        }

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
        tickerLists.forEach((tickerPair, idx:number) => {
            const scatterPlotStyle = SCATTER_PLOT_STYLES[idx % scatter_plot_styles_length]
            const tickerDataset: Dataset = {
                label: tickerPair,
                data: [],
                backgroundColor: scatterPlotStyle.backgroundColor,
                pointStyle: scatterPlotStyle.pointStyle
            }
            
            const sellOrders = tickersSellOrders[tickerPair]
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
        })
        
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

    }, [tickerLists, tickersSellOrders])



    return (
        <div className={`flex flex-col p-4`}>
            <div className="pb-4">
                <p className="text-3xl font-bold">{title}</p>
            </div>
            <div className="border border-gray-400 pt-0 rounded-xl">
                <canvas id="scatterplot"></canvas>
            </div>
        </div>
    )
}

export default ScatterChart