# Personal Chart Learning Plan v1

Planifier is an educational paper-planning app. This document is for learning chart language and improving Planifier's beginner mode. It is not financial advice, not a signal system, and not live-trade authority.

## North Star

Learn the chart before learning indicators.

The beginner mistake is loading too many indicators and never understanding market structure. The Planifier approach should be the opposite:

1. Read price location first.
2. Mark support, resistance, trend, and invalidation.
3. Add one indicator only when it answers a specific question.
4. Write the paper plan in plain English.
5. Review the result and update the rule.

## Learning Order

### Phase 1: Naked Chart Reading

Goal: look at a chart with no indicators and describe what price is doing.

Learn:

- Candles and wicks
- Support and resistance
- Higher highs and higher lows
- Lower highs and lower lows
- Ranges
- Breakouts
- Retests
- Fakeouts

Daily question:

```text
Is price trending, ranging, breaking out, breaking down, or retesting?
```

Planifier product requirement:

- Beginner mode should ask for support, resistance, current price, and invalidation before it asks about any indicator.

### Phase 2: Trend Tools

Goal: understand direction without guessing.

Learn:

- 20 EMA or SMA
- 50 EMA or SMA
- 200 MA
- Moving average slope
- Price above or below moving averages
- Chop when price cuts back and forth through averages

Simple read:

```text
Price above rising averages: bullish trend context.
Price below falling averages: bearish trend context.
Price cutting through flat averages: range or chop context.
```

Planifier product requirement:

- Moving average labels should explain what the average measures and why a crossover can be late.

### Phase 3: Momentum

Goal: understand whether the move is strong, tired, stretched, or diverging.

Learn:

- RSI 14
- MACD 12/26/9
- RSI overbought and oversold zones
- RSI near 50 as balanced momentum
- Bullish and bearish divergence
- MACD line, signal line, and histogram

Simple read:

```text
RSI does not say buy or sell. It says how stretched momentum is.
MACD does not snipe entries. It helps show whether momentum is shifting.
```

Planifier product requirement:

- Learning mode should translate RSI and MACD into a beginner question instead of a trade command.

### Phase 4: Volatility And Risk

Goal: understand how much room the idea needs before it is actually wrong.

Learn:

- ATR 14
- Bollinger Bands 20/2
- Volatility contraction
- Volatility expansion
- Why fixed stop distances can be misleading

Simple read:

```text
ATR measures movement size, not direction.
Bollinger Bands show whether price is calm, stretched, or expanding.
```

Planifier product requirement:

- The wrong-if line should be explained against normal volatility. A stop that is inside normal noise should be flagged as weak.

### Phase 5: Participation

Goal: understand whether real activity supported the move.

Learn:

- Volume bars
- Relative volume
- VWAP
- Anchored VWAP
- Volume Profile basics

Simple read:

```text
Volume tells participation, not direction.
VWAP gives a session fair-value reference.
Volume Profile shows where trading activity happened by price level.
```

Planifier product requirement:

- The chart should teach volume as confirmation context, especially on breakouts, support bounces, and failed moves.

### Phase 6: Crypto Futures Context

Goal: understand when crypto movement may be driven by leverage pressure.

Learn:

- Funding rate
- Open interest
- Liquidation clusters
- Long/short crowding
- Spot buying versus perp pressure

Simple read:

```text
Price up plus open interest up can mean new exposure is entering.
Price up plus open interest down can mean short covering.
Very positive funding can mean longs are crowded.
Very negative funding can mean shorts are crowded.
```

Planifier product requirement:

- Crypto futures context should be labeled as context only. It should never approve a live trade.

## Indicator Stack For Planifier Beginner Mode

Start with:

```text
Candles
Volume bars
Support / resistance drawing
20 EMA
50 EMA
200 MA
VWAP
RSI 14
MACD 12/26/9
Bollinger Bands 20/2
ATR 14
```

Add later:

```text
Volume Profile
Funding rate
Open interest
Liquidation levels
Relative volume
Market session markers
```

## Indicator Teaching Card Template

Every indicator in Planifier should explain:

```text
1. What it measures
2. What question it answers
3. When it helps
4. When it fails
5. What chart evidence should confirm it
6. What a beginner should write in the plan
```

Example for RSI:

```text
Measures: recent momentum on a 0-100 scale.
Question: Is momentum stretched, balanced, or diverging?
Helps: ranges, pullbacks, and divergence checks.
Fails: strong trends where RSI can stay high or low.
Confirm with: support/resistance, trend, candle behavior, and volume.
Plan sentence: RSI is recovering from oversold, but price still needs to reclaim resistance before this bounce idea improves.
```

## Daily Practice Routine

Use one pair at first. Start with BTC/USD or ETH/USD.

Every review, answer these in order:

```text
1. What market am I studying?
2. What timeframe is this?
3. Is price trending or ranging?
4. Where are support and resistance?
5. Where is current price compared with those levels?
6. Is price above or below the 50 and 200 moving averages?
7. Is RSI stretched, neutral, or diverging?
8. Is MACD momentum increasing or fading?
9. Is volume confirming the move?
10. What does ATR say about normal movement?
11. Where is invalidation?
12. Would I take this on paper? Why or why not?
```

One complete practice answer should sound like this:

```text
BTC/USD is on the 4H chart. Price is ranging between support near X and resistance near Y. Current price is closer to resistance, so the idea is lower quality for a fresh long. Price is above the 200 MA but chopping around the 50 MA. RSI is neutral near the middle, MACD is flattening, and volume is not confirming a breakout. ATR says normal movement is wide, so a tight wrong-if line would be weak. Paper plan: wait for a clean retest or rejection instead of forcing a middle-of-range trade.
```

## Weekly Learning Cadence

### Week 1: Support, Resistance, Candles

Practice:

- Mark three supports and three resistances on 10 charts.
- Write whether each level is exact or a zone.
- Screenshot one clean bounce, one clean rejection, and one fakeout.

Planifier improvement:

- Current price tag beside every support/resistance/wrong-if line.

### Week 2: Trend And Moving Averages

Practice:

- Add 20, 50, and 200 moving averages.
- Describe slope and price location.
- Find three examples where a crossover was late.

Planifier improvement:

- Moving average explainer card with "trend context, not entry permission."

### Week 3: RSI And MACD

Practice:

- Find three RSI divergence examples.
- Find three MACD histogram fade examples.
- Compare indicator clue against support/resistance.

Planifier improvement:

- Momentum panel that says "stretched, balanced, fading, or confirming."

### Week 4: ATR And Bollinger Bands

Practice:

- Compare stop distance against ATR.
- Find three Bollinger squeezes.
- Find three band walks in strong trends.

Planifier improvement:

- Wrong-if feedback that warns when the invalidation line is too tight for normal volatility.

### Week 5: Volume And VWAP

Practice:

- Compare breakout volume versus failed breakout volume.
- Watch price above, below, and reclaiming VWAP.
- Save examples of volume confirming and not confirming the same type of setup.

Planifier improvement:

- Historical example strip below the chart with volume/VWAP state included.

### Week 6: Crypto Futures Context

Practice:

- Track funding and open interest beside BTC or ETH movement.
- Separate spot-style demand from leverage pressure.
- Write one crowding note per review.

Planifier improvement:

- Futures context card labeled "context only" with no approval language.

## Product Backlog From This Learning Plan

High priority:

- Pair dropdown with asset type, current price, percent change, and timeframe.
- Current price labels on chart lines.
- Indicator explainer drawer.
- Historical example strip below the chart.
- Learning mode text that avoids repeating the same warning before every section.

Medium priority:

- Saved paper trades for paid users.
- Indicator-state snapshots saved with each plan.
- Review prompts after each historical example.
- Idea quality score for missing invalidation, weak location, or unclear thesis.

Longer term:

- Volume Profile, funding, open interest, and liquidation context.
- A personal pattern library for saved examples.
- Compare "my idea" versus "what actually happened."

## Guardrails

- No indicator should say "buy" or "sell."
- No Planifier screen should imply live execution.
- FoxClaw, Redshift, funding, or open interest context must remain advisory context only.
- Every plan should include invalidation.
- A setup in the middle of a range should usually be labeled lower quality for beginners.

## Sources To Keep Nearby

- StockCharts ChartSchool: Support and resistance, trend, indicators, overlays, ATR, VWAP, Bollinger Bands, Volume tools.
- CME Group: Technical analysis lessons, moving averages, support/resistance, oscillators, futures open interest.
- Kraken Learn: Crypto technical indicators and beginner technical analysis.
- BabyPips School of Pipsology: Beginner-friendly chart-reading sequence.
- TradingView: Hands-on chart practice and common mainstream indicator groupings.

