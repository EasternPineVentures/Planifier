# Planifier Learning Chart V1

Planifier now has a dedicated learning chart at `/chart`.

The chart also supports direct links:

```text
/chart?pair=BTC/USD&timeframe=4h
```

## Purpose

The learning chart helps a beginner slow down before writing a trade plan:

- choose a supported Kraken pair
- choose a simple timeframe
- inspect live public OHLC candles
- read plain-English candle context
- place entry, stop, and target practice levels
- estimate practice risk/reward
- save the practice map into My Plans
- compare historical candles from the loaded chart
- open a TradingView link or in-page mini chart for historical examples

This surface is educational and paper-planning only. It does not execute trades,
approve trades, set leverage, move funds, or provide financial advice.

## V1 Data Path

- API route: `app/api/market/ohlc/route.ts`
- Data source: Kraken public REST OHLC
- Default pair: `BTC/USD`
- Polling cadence: 20 seconds from the client
- Supported pairs: `BTC/USD`, `ETH/USD`, `SOL/USD`, `XRP/USD`
- Supported timeframes: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`

The route reuses `lib/market/kraken.ts` so Planifier keeps one public-market
OHLC helper.

## Save Path

The chart page can save entry, stop, target, pair, timeframe, selected candle
time, and estimated R/R through `POST /api/plans`. The route uses the existing
user-scoped `plans` table and stores a deterministic structured plan JSON that
matches `lib/plan/schema.ts`.

The plan JSON includes optional `chartSave` metadata so My Plans and the detail
view can render entry, stop, target, R/R, chart source, and TradingView context
without a database migration.

Saved chart plans appear in `/plans` and can use the existing plan detail and
journal flow. Signed-out users can use the chart, but must sign in to save.
Saving a plan does not execute, approve, or recommend a trade.

## Chart Library

The chart uses `lightweight-charts` from TradingView. The `/chart` page loads
the chart client-side through a no-SSR loader because the library needs browser
layout APIs.

## Beginner Mode

Beginner mode explains:

- candle close
- body size
- wick rejection
- volume context
- where an indicator would need explanation before it becomes useful

Indicator rule for future work: before showing an indicator reading, explain
what it measures, what it ignores, where it fails, and whether price action
agrees with it.

## Historical Examples

Historical example cards are generated from the currently loaded candle history.
Each card can:

- inspect the candle on the main Planifier chart
- open a Planifier mini chart with nearby candles
- open TradingView with the same Kraken symbol and interval

## Cleanup

Plan detail pages include a delete action. Deleting a plan removes the plan and
its journal entries through the existing owner-checked API route.

## Future Path

The next data upgrade is a WebSocket feed for faster candle updates. REST polling
is enough for V1 because the goal is learning chart structure, not speed.
