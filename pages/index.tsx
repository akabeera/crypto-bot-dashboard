import Image from "next/image"
import { Inter } from "next/font/google"
import CurrentHoldings from "@/components/CurrentHoldings"
import ScatterChart from "@/components/ScatterChart"

const inter = Inter({ subsets: ["latin"] })

export default function Home() {
  return (
    <main className={`flex flex-col justify-between p-4 ${inter.className}`}>
      <div className="z-10 w-full items-center justify-between font-mono">
        <p className="text-3xl left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Crypto-Bot Performance Dashboard
        </p>
      </div>

      <div>
        <div className="w-full">
          <CurrentHoldings/>
        </div>
          <ScatterChart />
        <div>

        </div>
      </div>

    </main>
  );
}
