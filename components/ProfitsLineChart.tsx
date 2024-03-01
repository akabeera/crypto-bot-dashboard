import React, {useState, useEffect} from "react"
import Chart from "chart.js/auto"
import 'chartjs-adapter-date-fns'
import { SellOrder } from "@/interfaces/sellOrder"
import { Dictionary } from "@/interfaces/dictionary"
import { convertEpochToYYYYMMDD } from  "@/utils/dates"
import { SCATTER_PLOT_STYLES } from "@/utils/constants"
import {enUS} from 'date-fns/locale';


type Props = {
    title: string,
    tickerLists: string[] | undefined,
    tickersSellOrders: Dictionary<SellOrder[]> | undefined
}

interface DataPoint {
    x: any,
    y: number
}

interface Dataset {
    label: string,
    data: DataPoint[],
    backgroundColor?: string,
    pointStyle?: string
}

const ProfitsLineChart = ({title, tickerLists, tickersSellOrders}: Props) => {
    const [chartInstance, setChartInstance] = useState<Chart | null>(null);


    useEffect(() => {
        if (!tickerLists || !tickersSellOrders || tickerLists.length == 0 || !tickersSellOrders){
            return
        }

        const canvas = document.getElementById('profilelinechart') as HTMLCanvasElement
        if (!canvas) {
            return
        }

        // Destroy the existing chart instance if it exists
        if (chartInstance){
            chartInstance.destroy();
        }

        let tickersSellOrdersArray:SellOrder[] = []
        tickerLists.forEach((tickerPair) => {
            const sellOrders = tickersSellOrders[tickerPair]
            tickersSellOrdersArray = tickersSellOrdersArray.concat(sellOrders)
        })

        const datasets: Dataset[] = []
        tickersSellOrdersArray.sort((a, b) => a.sell_order.timestamp - b.sell_order.timestamp)
        let profit = 0
        const dataPoints: DataPoint[] = []
        const labels: string[] = []
        tickersSellOrdersArray.forEach((sellOrder) => {
            const proceeds = sellOrder.sell_order.cost - sellOrder.sell_order.fee.cost
            let pricePaid = 0
            const closed_positions = sellOrder.closed_positions
            closed_positions.forEach((cp) => {
                pricePaid += cp.cost + cp.fee.cost
            })

            profit += proceeds - pricePaid

            const sellOrderDate = convertEpochToYYYYMMDD(sellOrder.sell_order.timestamp)
            labels.push(sellOrderDate)
            
            const dataPoint: DataPoint = {
                x: sellOrderDate,
                y: profit
            }
            dataPoints.push(dataPoint)
        })

        const dataset: Dataset = {
            label: "Profit over time",
            data: dataPoints
        }
        datasets.push(dataset)
        const data = {
            datasets: datasets.map((ds) =>  {
                return {
                    label: ds.label,
                    data: ds.data.map(pts => { return {x: pts.x, y: pts.y}})
                }
            })
        }

        const newChartInstance = new Chart(canvas, {
            type: 'line',
            data: data,
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        adapters: {
                            date: {
                                locale: enUS
                            }
                        }
                    },
                },
                
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
            <canvas id="profilelinechart"></canvas>
        </div>
    </div>
    )
}

export default ProfitsLineChart