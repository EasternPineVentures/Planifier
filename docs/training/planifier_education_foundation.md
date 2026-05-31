# Planifier Education Foundation

Planifier should help beginners build educational paper-trade plans. It should not
tell users what to buy, sell, short, or hold. The product language should stay in
the lane of observation, confirmation, invalidation, risk, and journaling.

## Beginner Mental Model

A new user may not have a setup. The first job is to give them somewhere to start:

1. Pick a market or pair.
2. Pick a timeframe.
3. Observe the recent structure.
4. Choose a starting angle.
5. Define what must happen before the idea matters.
6. Define what proves the idea wrong.
7. Build a paper-trade plan only after those pieces exist.

## Core Chart Concepts

Planifier examples should teach these concepts first:

- Trend: whether price is generally making higher highs/higher lows, lower
  highs/lower lows, or moving sideways.
- Support and resistance: zones where demand or supply previously mattered.
- Range: an area where price moves between support and resistance.
- Breakout: price leaving a range or level, requiring confirmation.
- Retest: price returning to a broken level to see if it now holds.
- Pullback: price moving against the trend toward a possible decision area.
- Failed move: price breaks or tests a level, then quickly returns.
- Invalidation: the condition that proves the plan idea is wrong.

## Candidate Setup Types

### Continuation

Use when trend structure is intact. The plan should wait for confirmation, not
chase. The lesson is patience after a move.

Needs:

- trend direction
- level that should hold
- confirmation condition
- invalidation if structure breaks

### Breakout Retest

Use when price has moved through a level and may test it again. The plan should
separate acceptance above/below the level from a failed breakout.

Needs:

- prior resistance or support
- breakout level
- retest behavior
- failure condition

### Range Edge

Use when price is boxed between support and resistance. The plan should often say
the middle of the range is low-quality.

Needs:

- range support
- range resistance
- current location inside range
- condition that moves the idea from watchlist to plan

### Failed Move

Use when price appears to trap one side of the market. This must be lower
confidence until the failure is visible.

Needs:

- level that failed
- reclaim or rejection evidence
- trigger candle or structure shift
- invalidation if the break becomes accepted

## What Planifier Must Avoid

- "This is the obvious trade."
- "Buy here."
- "Short here."
- "Guaranteed."
- "No risk."
- Overfitting one candle into a full thesis.
- Treating a vague input as enough context.
- Treating FoxClaw context as live approval.

## Source Spine

- Kraken public OHLC can provide live/recent candle data for supported crypto
  pairs. The REST endpoint returns recent OHLC rows and includes the current,
  not-yet-committed candle, so Planifier should prefer committed candles for
  summaries.
- CoinDesk and Cointelegraph RSS feeds can provide recent crypto headlines.
  Headlines are context only: they can explain possible catalysts or caution
  flags, but they do not confirm an entry, exit, or directional trade.
- Chart education should emphasize support, resistance, trend, ranges, and
  volume as context, not prediction.
- Risk education should remind users that time horizon, risk tolerance, and
  diversification matter, and that trading volatile products can lose money.
- Crypto and forex examples should include stronger risk language because these
  markets can be volatile, leveraged, fraud-prone, and unsuitable for many users.

## Useful References

- Kraken OHLC REST API: https://docs.kraken.com/api/docs/rest-api/get-ohlc-data
- CoinDesk RSS feed: https://www.coindesk.com/arc/outboundfeeds/rss
- CoinDesk RSS explainer:
  https://www.coindesk.com/coindesk-news/2021/09/17/coindesk-rss
- Cointelegraph RSS feed: https://cointelegraph.com/rss
- StockCharts ChartSchool technical analysis overview:
  https://chartschool.stockcharts.com/table-of-contents/overview/technical-analysis
- StockCharts ChartSchool support and resistance:
  https://chartschool.stockcharts.com/table-of-contents/chart-analysis/support-and-resistance
- FINRA day-trading risk disclosure:
  https://www.finra.org/rules-guidance/rulebooks/finra-rules/2270
- CFTC virtual currency trading risks:
  https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/understand_risks_of_virtual_currency.html
- Investor.gov asset allocation and diversification:
  https://www.investor.gov/introduction-investing/getting-started/assessing-your-risk-tolerance
