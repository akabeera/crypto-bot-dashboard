import React from "react"

type Props = {
    label: string
    value: string
    // sign drives the value color: positive green / negative red / neutral ink
    sign?: number | null
}

const StatTile = ({ label, value, sign }: Props) => {
    let valueClass = "text-white"
    if (typeof sign === "number" && sign !== 0) {
        valueClass = sign > 0 ? "text-green-500" : "text-red-400"
    }
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 min-w-36">
            <div className="text-xs text-neutral-400 pb-1">{label}</div>
            <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
        </div>
    )
}

export default StatTile
