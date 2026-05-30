# Planifier Mobile Testing

How to test Planifier on phone-sized surfaces while developing on a Windows machine.

## 1. Browser DevTools (first pass, fastest)

Use Chrome or Edge responsive device mode for layout testing.

1. Open Planifier in Chrome/Edge: `http://localhost:3000`
2. Open DevTools (`F12`)
3. Toggle device toolbar (`Ctrl+Shift+M`)
4. Cycle through the test viewports listed below

This catches 80% of layout issues (overflow, tap-target size, sticky-CTA collisions) without leaving the browser.

**Limitations:** DevTools does not simulate touch latency, real keyboard behavior, scroll inertia, or Safari/WebKit-specific quirks. It's a first pass, not the final word.

## 2. Android Emulator (closest to real Android without a device)

Android Studio includes the Android Emulator.

**Setup:**

1. Install Android Studio (`https://developer.android.com/studio`)
2. Open the **Device Manager** (`Tools → Device Manager`)
3. Click **Create Virtual Device**
4. Pick a phone profile (Pixel 7 is a sensible default)
5. Download a system image (any recent stable Android API level)
6. Start the emulator
7. In a separate terminal, start Planifier locally:
   ```
   npm run dev
   ```
8. Open Chrome inside the emulator and navigate to:
   ```
   http://10.0.2.2:3000
   ```

`10.0.2.2` is the Android emulator's alias for the host machine's `localhost`. Do not use `localhost` from inside the emulator — that resolves to the emulator itself.

**Easier alternative:** push a Vercel preview branch and open the preview URL directly in the emulator. No port-mapping headaches, and you're testing the actual production bundle.

## 3. iOS Testing From Windows

iOS Simulator requires macOS + Xcode and cannot be run on Windows.

**Options for Windows users (in order of cost/effort):**

1. **Browser responsive mode first.** Chrome's iPhone presets approximate WebKit layout reasonably well for our use case.
2. **A real iPhone on the same network.** Run `npm run dev`, find your machine's LAN IP (e.g. `192.168.x.y`), and open `http://192.168.x.y:3000` on the phone. Requires Windows Firewall to allow inbound on port 3000.
3. **A Vercel preview URL** opened in mobile Safari on a real device.
4. **BrowserStack / LambdaTest** (cloud) — paid, but covers WebKit, multiple iOS versions, and real touch.

**WebKit quirks to specifically check:**
- `100vh` includes the URL bar (use `100dvh` or fixed heights for full-screen sheets)
- `position: sticky` + `safe-area-inset-bottom` for sticky CTAs
- File input accept on the chart-upload field actually triggers the camera/photo picker

## 4. Suggested Test Matrix

| Viewport | Target device class | Tests as |
|---|---|---|
| 320×568 | iPhone SE 1st gen / small Android | "Does anything overflow on the smallest realistic screen?" |
| 390×844 | Modern iPhone (12/13/14/15) | "Default iOS layout" |
| 412×915 | Modern Android (Pixel 7) | "Default Android layout" |
| 768×1024 | Tablet (iPad mini portrait) | "2-column starts to make sense" |
| 1280×800 | Desktop laptop | "Full sidebar / multi-column" |

## 5. Flow-Level Test Checklist

For each viewport above, walk the following flows and check the criteria:

### Flows
1. **Sign in** (Clerk widget renders without overflow, OAuth button is reachable)
2. **Build new plan** from `/plan/new` — five inputs reachable without horizontal scroll
3. **Generate plan** — `PlanView` scrolls smoothly, no layout jump
4. **View saved plans** at `/plans` — cards stack correctly, none get cut off
5. **Open plan detail** — header is readable, back navigation works
6. **Expand/collapse PlanView sections** — each section toggles cleanly on tap
7. **Open Trusted Source Links** — links open in a new tab/window without breaking session state
8. **Add journal entry** — keyboard does not cover the save button; draft survives a back-swipe
9. **Check PWA smoke behavior after deploy** — browser offers install/add-to-home-screen where supported

### Per-flow criteria
- [ ] **No horizontal scroll** at any point (the page never extends beyond 100vw)
- [ ] **Buttons are tappable** — at least 44×44pt, with ≥ 8pt spacing from neighbors
- [ ] **Sticky CTAs stay above the keyboard** (iOS Safari is the hard case)
- [ ] **Collapsible sections** can be opened and closed by tap; chevrons rotate clearly
- [ ] **Streamed chat responses** don't push the input box off-screen
- [ ] **Image upload** opens the system picker and the preview thumbnail fits the panel
- [ ] **Warning banners** stack vertically and remain legible
- [ ] **Pre-Trade Checklist banner** is the first visible element on a plan result
- [ ] **Disclaimer footer** is reachable via scroll but does not push CTAs off-screen
- [ ] **Sign-out** is reachable in ≤ 2 taps from any screen

## 6. Things We Are NOT Testing (yet)

- Native install / PWA add-to-home — manifest + icons are tracked under "later"
- Push notifications — out of scope (and out of product fit)
- Offline mode beyond localStorage journal drafts
- Accessibility full sweep (screen reader, keyboard-only) — needed before public launch, not for first deploy

## PWA Smoke Test

After deployment, open Planifier on a mobile browser and check whether the browser offers an install/add-to-home-screen option.

This currently validates the manifest/mobile metadata only. Full offline behavior is not supported yet.

## Mobile Acceptance Checklist

- [ ] No horizontal scrolling on phone width
- [ ] Build Plan stepper is usable with thumbs
- [ ] PlanView sections expand/collapse cleanly
- [ ] Pre-Trade Checklist is visible by default
- [ ] Strategy Notes is visible by default
- [ ] Saved plans render as cards
- [ ] Journal form is readable and easy to complete
- [ ] Trusted Source Links open in new tabs
- [ ] PWA manifest is detected after deploy
- [ ] `/api/health` returns healthy status in deployed environment
