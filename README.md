# crypto-bot-dashboard

Next.js dashboard for the [crypto_bot](../crypto_bot) trading bot: live holdings and
realized P&L from the bot's MongoDB, plus backtest visualizations from
`crypto_bot/backtest/results`.

## Setup

```bash
npm install
npm run dev   # http://localhost:3000
```

### Environment (`.env.local`)

| Var | Purpose |
|---|---|
| `MONGODB_URI` | The bot's MongoDB (Atlas). Use the standard `mongodb://host1,host2,host3/...` form — Node's `mongodb+srv://` SRV lookups can time out on Windows |
| `DB_NAME` | `crypto-bot` |
| `TRADES_COLLECTION_NAME` / `SELL_ORDERS_COLLECTION_NAME` | `trades` / `sell_orders` |
| `SUPPORTED_TICKERS` | comma-separated base tickers used to filter sell orders |
| `API_KEY` / `API_SECRET` | Coinbase credentials, same values as `crypto_bot/.env`. Optional — without them prices fall back to public per-symbol fetches |
| `EXCHANGE_ID` | ccxt exchange id (default `coinbase`, same as the bot) |
| `BACKTEST_RESULTS_DIR` | override; defaults to `../crypto_bot/backtest/results` |
| `BACKTEST_DATA_DIR` | override; defaults to `../crypto_bot/backtest/data` |

## Data flow

- **Market prices** come from the same exchange the bot trades on, via
  [ccxt](https://github.com/ccxt/ccxt) (`/api/prices`) — not a third-party
  aggregator — so dashboard P&L matches what the bot sees. Profit math mirrors
  `crypto_bot/utils/trading.py:calculate_profit_percent` (fee-rate-estimated
  sell fee, cost basis excluding buy fee).
- **Mongo documents** store many numeric fields as strings (Coinbase API
  quirk). Every API route passes documents through `utils/normalize.ts`;
  client code can assume numbers.
- **Backtests** (`/backtest`) read the CSV/JSON contract documented in
  `crypto_bot/backtest/RESULTS_FORMAT.md`: equity curve, per-ticker price with
  buy/sell fills (from the backtester's own candle cache), and a run
  comparison table across `run_*.json` summaries.

Requires Node >= 20.17 (developed on Node 22, Next 15) — older Node breaks
ccxt 4.5.x, which ships ESM-only dependencies.
