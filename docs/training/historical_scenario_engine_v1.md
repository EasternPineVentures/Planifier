# Historical Scenario Engine V1

Planifier should help users practice playing out chart paths before they happen.
The product goal is not "predict the next candle." The goal is:

1. Describe the current chart structure.
2. Find similar historical structures.
3. Measure what happened next.
4. Turn that evidence into scenario branches.
5. Teach the user what would confirm, invalidate, or weaken each branch.

This keeps Planifier educational, paper-trading only, and honest about
uncertainty.

## Product Shape

The user should see a chart scenario like a decision tree:

- If price confirms: what should the user watch for?
- If price fails: what proves the idea wrong?
- If price chops: when should the user stand aside?

The output should never say "this will happen." It should say "historically,
similar structures often resolved through these paths; here is what would make
each path more or less credible."

## Data Inputs

V1 can use:

- Public OHLC candles for the requested pair/timeframe.
- Recent market/news context as advisory context only.
- User chart notes or screenshot-derived chart notes.
- Sanitized FoxClaw context only if explicitly available as `context_only`.

Production should store enough historical candles locally or in a database so
pattern matching does not depend on repeated live API calls.

## Engine Pipeline

### 1. Candle Hygiene

Normalize every candle:

- timestamp
- open, high, low, close
- volume if available
- timeframe
- source
- whether the candle is committed or still forming

Never train or score on the current uncommitted candle as if it were historical
truth.

### 2. Structure Extraction

Convert raw candles into features:

- trend slope over recent windows
- higher high / higher low or lower high / lower low structure
- recent support and resistance zones
- distance from support/resistance
- volatility range, such as ATR-style movement
- breakout/retest/failure behavior
- volume confirmation when volume exists
- current location: range high, range low, midpoint, or trend pullback

These features should be explainable in beginner language. If we cannot explain
why a match was found, the match should not drive the UI.

### 3. Pattern Candidate Detection

Start with rules before machine learning:

- support retest
- resistance retest
- failed breakout
- failed breakdown
- range middle
- range edge
- trend continuation pullback
- reclaim
- rejection

Each detector should output:

- pattern label
- confidence as evidence quality, not trade confidence
- matched level or zone
- invalidation idea
- missing evidence

### 4. Historical Episode Search

For each detected structure:

1. Build a feature vector for the current chart window.
2. Search prior windows with similar feature vectors.
3. Exclude overlapping windows and future-leaking data.
4. Group outcomes by what happened over the next N candles.
5. Produce branch frequencies, not predictions.

Example branch grouping:

- continuation above level
- rejection below level
- chop/no resolution
- volatility expansion
- invalidation hit first

The UI should show approximate counts, such as "18 similar examples checked,"
instead of pretending the sample is bigger or cleaner than it is.

### 5. Outcome Windows

The holding period should determine the evaluation window:

- Scalp: next 3-12 candles, depending on timeframe.
- Day: next 6-24 candles.
- Swing: next 10-40 candles.
- Position: next 20-100 candles.

These are educational defaults. They should be configurable internally and
validated out of sample before being treated as useful.

### 6. Validation

This is the part that protects us from building nonsense.

Use time-aware validation:

- train on older candles
- validate on newer candles
- never random-shuffle market history
- use a gap between training and validation if labels overlap future candles
- report out-of-sample behavior separately from in-sample behavior

Track:

- sample count
- branch frequency
- invalidation-first frequency
- average and median move after pattern
- worst-case move before confirmation
- how often the pattern stayed unresolved
- whether results changed across regimes

Do not optimize dozens of detector settings and then present the best one as
truth. That is backtest overfitting.

## UI Contract

Every generated scenario should include:

- chart visual
- current detected structure
- three branches: confirm, fail, wait
- historical evidence count
- what confirms this branch
- what invalidates this branch
- what a beginner often gets wrong

Good language:

```text
Similar support retests often resolved in three ways. Here is what to watch
before deciding whether the practice plan is still valid.
```

Bad language:

```text
This pattern predicts a breakout.
```

## Safety Boundary

The scenario engine must not:

- place trades
- approve trades
- set leverage
- increase risk above the fixed Planifier guardrail
- present branch frequency as certainty
- blend Redshift capital/leverage stance into Planifier output
- treat FoxClaw context as execution authority

The engine may:

- show historical analogs
- explain what happened next in similar cases
- visualize possible branches
- generate paper-trading chart context
- teach confirmation, invalidation, and stand-aside conditions

## Implementation Plan

### Phase 1: Deterministic Example Library

Status: started.

Use hand-authored scenario charts for support retest, failed breakout, and range
middle. This teaches the UI pattern without pretending we have historical
evidence yet.

### Phase 2: Historical Candle Store

Add a local/API-backed candle store:

- asset
- timeframe
- timestamp
- OHLCV
- source
- committed flag

Start with Kraken-supported crypto pairs because Planifier already has Kraken
market snapshot code.

### Phase 3: Rule-Based Detectors

Implement explainable detectors for the first five patterns:

1. support retest
2. failed breakout
3. range middle
4. range edge
5. trend pullback

Each detector must return both machine-readable features and beginner-readable
reasoning.

### Phase 4: Similar-Episode Search

Add a matching engine that finds prior windows with similar features. V1 can use
simple weighted distance across normalized features before considering machine
learning.

### Phase 5: Evidence Cards

Show:

- number of historical examples
- top three branch outcomes
- confirmation rule
- invalidation rule
- "not enough evidence" state when sample count is too small

### Phase 6: Out-of-Sample Audit

Before calling the engine useful, run a time-split validation report. The report
should prove that the engine is not just memorizing history.

## References

- Kraken OHLC docs:
  https://docs.kraken.com/api/docs/rest-api/get-ohlc-data
- Kraken WebSocket OHLC docs:
  https://docs.kraken.com/api/docs/websocket-v1/ohlc/
- Lo, Mamaysky, Wang, "Foundations of Technical Analysis":
  https://ideas.repec.org/p/sce/scecf9/402.html
- scikit-learn TimeSeriesSplit:
  https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html
- TA-Lib:
  https://ta-lib.org/index.html
