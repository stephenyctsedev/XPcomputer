# Homepage Marquee and Pinball Trap Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the grey blocks that scroll through the homepage marquee, and make the pinball table drainable — today a ball never reaches the outhole and instead comes to permanent rest in one of four pockets.

**Architecture:** Two independent parts. **Part A** is a two-line CSS/markup scope fix in the homepage iframe document. **Part B** is a table-geometry fix in the pure `table.js` layout plus a jam detector in `stepTable`, guarded by a new automated trap sweep that plays the table from hundreds of start states and asserts every ball eventually drains. Part A and Part B touch no shared files and may be executed in either order, or separately.

**Tech Stack:** Plain JavaScript, Vitest + jsdom, canvas 2D.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §7.3 (pinball) and §6 (homepage). This is a defect-repair plan; the original build plans are `docs/superpowers/plans/2026-09-07-phase5-pinball.md` and `docs/superpowers/plans/2026-09-07-phase1-xp-shell-and-resume.md`.

## Global Constraints

- `physics.js` and `table.js` stay pure: no DOM, no timers, no `Math.random`. The UI owns the clock.
- Table space stays 400 x 700 units, gravity along +y, fixed physics step `1/240` s.
- Scoring, controls, tilt rules, lane letters and the `xpcomputer.pinball.high` storage key are unchanged by this plan.
- The homepage is rendered into an `<iframe srcdoc>`, so `src/styles/*.css` never reaches it. Anything the homepage needs must live in `src/xp/apps/homepage.css`.
- Files are UTF-8.
- **Never `git commit` or `git push` unless Stephen says so.** "Stage" steps run `git add` only.

---

## Evidence Behind This Plan

Measured before writing it, so the executor does not have to re-derive any of it.

### A. Marquee grey blocks

The banner markup is `<div class="marquee"><span>... <span class="digit">0</span>... </span></div>`.
The rule `.marquee span { display:inline-block; padding-left:100%; animation:marquee 22s linear infinite; }`
is a **descendant** selector, so it also matches the six `.digit` spans of the visitor counter, and
at specificity (0,1,1) it outranks `.digit` at (0,1,0).

Measured in Chrome on the real document, for each of the six digits:

| Property | `.digit` intends | Actually computes to |
|---|---|---|
| `padding-left` | `3px` | `711.73px` |
| width | ~11px | `724px` |
| `background-color` | `#222` | `#222` |
| `animation-name` | none | `marquee` |

Six 724px-wide `#222` boxes, each running its own 22-second animation at its own offset, slide
through a 756px-wide black bar. That is the grey block in the screenshot.

### B. Pinball: the ball never drains

`stepTable` drains at `ball.y - ball.r > 730`. A sweep of 243 balls released across the playfield
(x = 32...344, y in {260, 360, 460}, vx in {-300, 0, +300}, no flipper input, 12 s each) drains
**0 of 243**.

Four distinct terminal pockets, all with a position range of 0.00 over the final 3 s — a perfect
standstill, not a slow roll:

| Pocket | Hits / 243 | Where | Why |
|---|---|---|---|
| `(200, 661)` | 203 | Between the flipper tips | At rest the tips sit at x = 189.2 and 210.8 with capsule radius 6 each, leaving **9.5px** of clear space for a **16px** ball. The ball perches on both tips forever. |
| `(52, 559)` | 23 | Left outlane | The left slingshot's bottom edge (`y = 560`, x 60 to 105) sits ~11px above the inlane guide `(20,540)-(124,636)`. Narrower than the ball. |
| `(29...52, 357)` | 6 | Inside the drop-target bank | The bank is a hollow 3-segment box `(20,275)-(60,275)-(60,365)-(20,365)` closed on the left by the outer wall. A fast ball tunnels in and can never leave. |
| `(32...56, 267)` | 1 | On top of the bank | `(20,275)-(60,275)` is a perfectly horizontal ledge against the left wall. The ball settles and stops. |

A wider sweep (2070 starts) adds two more, each under 0.5%: the notch between the inlane guide's
lower end `(124,636)` and the flipper pivot `(128,640)`, and a rest spot at the top of the plunger
lane near `(370,168)`. The right-hand pocket in the screenshot is the same family: the right
slingshot body sits at x = 340 while the right playfield wall is at x = 352, a **12px** channel the
ball cannot enter but wedges against at `(348,537)`.

**Why the right side is wrong:** the table is not mirror-symmetric. The plunger lane eats x 352 to
380, so the right playfield wall is at 352, not 380. The right slingshot was placed at x = 340, the
mirror of the left one about the table centre (200), instead of the mirror about the **playfield**
centre (186). Moving it to x = 312 restores a 40px right outlane matching the left.

**Verified fix.** With the geometry in Task B3 through B6 applied at runtime, the same 243-ball sweep
drains **234/243**, and all nine misses are balls the sweep started *inside* the sealed bank box.
Excluding those, it is **234/234**. The tip-to-tip clear gap becomes **31.7px = 1.98 ball diameters**,
the conventional outhole width on a real table.

Two alternatives were measured and rejected:

- **Gap 44px** (pivots 118/282, length 62, rest 0.52) drains 99.8% but is 2.8 ball diameters — balls
  drain almost unopposed and the game stops being fun.
- **Running the inlane guide past the pivot** to `(116,648)` looked tidier and made things *worse*:
  it created a new wedge at `(111,631)` that caught 283 of 2070 balls. The guide must end **at** the
  pivot. This is why Task B2 lands the sweep test before any geometry moves.

---

## File Structure

| File | Change |
|---|---|
| `src/xp/apps/homepage.css` | Scope the scroller rule to a class; add a reduced-motion rule |
| `src/xp/apps/Homepage.js` | Give the scrolling span that class |
| `src/xp/apps/Homepage.test.js` | New test: the scroller rule cannot match a counter digit |
| `src/xp/games/pinball/table.trap.test.js` | **New.** Trap sweep: every released ball drains |
| `src/xp/games/pinball/table.js` | Flipper geometry, slingshot and guide positions, bank top, jam detector |
| `src/xp/games/pinball/table.test.js` | Fixtures moved with the geometry; new drain and jam tests |
| `src/xp/games/pinball/render.js` | Bank fill rect follows the sloped bank top |
| `src/xp/games/pinball/Pinball.js` | Consume the shared step constant; sounds for two new events |
| `README.md` | QA checklist entries for both fixes |

---

# Part A — Homepage marquee

### Task A1: Stop the marquee rule reaching the counter digits

**Files:**
- Modify: `src/xp/apps/homepage.css:8`, `src/xp/apps/Homepage.js:22`
- Test: `src/xp/apps/Homepage.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the class name `marquee-text` on the scrolling span. Nothing else reads it.

- [ ] **Step 1: Write the failing test**

Append to `src/xp/apps/Homepage.test.js`, inside the existing `describe('renderHomepage')` block:

```js
  it('gives the scroller its own class so the counter digits are not swept up by it', () => {
    expect(html).toMatch(/<div class="marquee"><span class="marquee-text">/);
  });

  it('the marquee animation rule cannot match a visitor-counter digit', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('./homepage.css', import.meta.url), 'utf8');
    const animated = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, , body]) => /animation\s*:\s*marquee/.test(body))
      .map(([, selector]) => selector.trim());
    expect(animated.length).toBeGreaterThan(0);

    const host = document.createElement('div');
    host.innerHTML = '<div class="marquee"><span class="marquee-text">hi <span class="digit">7</span></span></div>';
    const digit = host.querySelector('.digit');
    const scroller = host.querySelector('.marquee-text');
    for (const selector of animated) {
      expect(digit.matches(selector)).toBe(false);
      expect(scroller.matches(selector)).toBe(true);
    }
  });
```

Why `matches()` and not `getComputedStyle()`: jsdom implements selector matching correctly (nwsapi)
but does **not** implement the cascade faithfully — it reports `padding-left: 3px` for a digit where
Chrome reports `711.73px`. Asserting on matching is the part jsdom gets right, and it encodes the
root cause exactly: no animated rule may select a digit.

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/xp/apps/Homepage.test.js
```

Expected: both new tests fail. The first because the span has no class; the second with
`expect(digit.matches('.marquee span')).toBe(false)` receiving `true`.

- [ ] **Step 3: Add the class in the markup**

In `src/xp/apps/Homepage.js:22`, change:

```js
  <div class="marquee"><span>*** Welcome to my homepage! *** You are visitor number ${counter} *** Thanks for stopping by! ***</span></div>
```

to:

```js
  <div class="marquee"><span class="marquee-text">*** Welcome to my homepage! *** You are visitor number ${counter} *** Thanks for stopping by! ***</span></div>
```

- [ ] **Step 4: Scope the CSS rule**

In `src/xp/apps/homepage.css:8`, change:

```css
.marquee span { display: inline-block; padding-left: 100%; animation: marquee 22s linear infinite; }
```

to:

```css
.marquee > .marquee-text { display: inline-block; padding-left: 100%; animation: marquee 22s linear infinite; }
```

Both the class and the child combinator are deliberate: the class says which element scrolls, and
the child combinator stops any future nested element inheriting the behaviour by accident.

- [ ] **Step 5: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/apps/Homepage.test.js
```

Expected: PASS, including the pre-existing `shows a six digit visitor counter` test.

- [ ] **Step 6: Confirm it in a real browser**

The bug only reproduces under a real cascade, so jsdom passing is not sufficient evidence.

```bash
npm run dev
```

Open the site, launch Internet Explorer, load the homepage, and check the banner: one black bar,
green text scrolling right to left, six small yellow-on-dark digits riding inside the sentence, and
no grey rectangle anywhere. Confirm the digits stay the size of a character, roughly 11px wide.

- [ ] **Step 7: Stage**

```bash
git add src/xp/apps/homepage.css src/xp/apps/Homepage.js src/xp/apps/Homepage.test.js
```

### Task A2: Honour reduced motion inside the homepage iframe

The project already respects `prefers-reduced-motion` in `src/styles/room.css:23` and
`src/styles/xp-overrides.css:198`, but neither stylesheet reaches the iframe document, so the
marquee scrolls regardless of the setting. This closes that gap while the file is open.

**Files:**
- Modify: `src/xp/apps/homepage.css`
- Test: `src/xp/apps/Homepage.test.js`

**Interfaces:**
- Consumes: the `marquee-text` class from Task A1.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append inside the same `describe` block:

```js
  it('stops the marquee scrolling when the visitor prefers reduced motion', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('./homepage.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^}]*\.marquee-text[^}]*animation: none/s);
  });
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/xp/apps/Homepage.test.js
```

Expected: FAIL, no match.

- [ ] **Step 3: Add the rule**

In `src/xp/apps/homepage.css`, immediately after the `@keyframes marquee` line:

```css
@media (prefers-reduced-motion: reduce) { .marquee > .marquee-text { animation: none; padding-left: 0; } }
```

`padding-left: 0` matters: without the animation the 100% padding would push the whole sentence off
the right edge and the bar would look empty.

- [ ] **Step 4: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/apps/Homepage.test.js
```

Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/xp/apps/homepage.css src/xp/apps/Homepage.test.js
```

---

# Part B — Pinball

Task order matters. B1 and B2 build the harness that proves the geometry work in B3 through B6, and
the rejected alternative in the evidence section shows why guessing at these corners without the
harness makes things worse.

### Task B1: Expose the table's fixed step so tests and UI agree

`Pinball.js` steps at `1/240`; the existing tests use the same number as a local constant. The trap
sweep needs it too. Export it once rather than spreading a third copy.

**Files:**
- Modify: `src/xp/games/pinball/table.js`, `src/xp/games/pinball/Pinball.js:7`
- Test: `src/xp/games/pinball/table.test.js`

**Interfaces:**
- Produces: `export const STEP = 1 / 240;` from `table.js`.

- [ ] **Step 1: Write the failing test**

Change the import line at the top of `src/xp/games/pinball/table.test.js` to include `STEP`:

```js
import { createTable, stepTable, NO_INPUT, FLIPPER, SCORES, STEP } from './table.js';
```

and add this test inside the existing `describe('table')` block:

```js
  it('publishes the fixed physics step', () => {
    expect(STEP).toBeCloseTo(1 / 240, 10);
  });
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/xp/games/pinball/table.test.js
```

Expected: FAIL, `STEP` is undefined.

- [ ] **Step 3: Export it and consume it**

In `src/xp/games/pinball/table.js`, beside the other exported constants near the top:

```js
export const STEP = 1 / 240;
```

In `src/xp/games/pinball/Pinball.js`, delete the local `const STEP = 1 / 240;` on line 7 and add
`STEP` to the existing import from `./table.js`:

```js
import { createTable, stepTable, LETTERS, STEP } from './table.js';
```

- [ ] **Step 4: Run the whole pinball suite**

```bash
npx vitest run src/xp/games/pinball
```

Expected: PASS.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/pinball/table.js src/xp/games/pinball/Pinball.js src/xp/games/pinball/table.test.js
```

### Task B2: Land the trap sweep as a failing test

This is the test that describes the bug the player reported: a ball put anywhere on the playfield
must eventually leave it. It fails 243 times today. Do not fix anything yet.

**Files:**
- Create: `src/xp/games/pinball/table.trap.test.js`

**Interfaces:**
- Consumes: `createTable`, `stepTable`, `STEP`, `TABLE`, `NO_INPUT` from `./table.js`.
- Produces: nothing; it is a test-only file.

- [ ] **Step 1: Write the failing test**

Create `src/xp/games/pinball/table.trap.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createTable, stepTable, STEP, TABLE, NO_INPUT } from './table.js';

/** Regions the ball can never legitimately occupy, so a sweep must not start a ball inside one. */
const SOLID = [
  (x, y) => x > 20 && x < 60 && y > 280 && y < 365,                          // drop-target bank body
  (x, y) => y > 470 && y < 530 && x > 60 && x < 60 + 45 * (y - 470) / 60,    // left slingshot body
  (x, y) => y > 470 && y < 530 && x < 312 && x > 312 - 45 * (y - 470) / 60,  // right slingshot body
];
const inSolid = (x, y) => SOLID.some((f) => f(x, y));

/** Release a ball in play and report where it ends up. 'drain' means it left the table. */
function release(x, y, vx, seconds = 12) {
  const t = createTable();
  Object.assign(t.ball, { x, y, vx, vy: 0, inLane: false, atRest: false });
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (stepTable(t, STEP, NO_INPUT).some((e) => e.type === 'drain')) return 'drain';
  }
  return `stuck at (${t.ball.x.toFixed(0)}, ${t.ball.y.toFixed(0)})`;
}

describe('the table has no ball traps', () => {
  it('drains every ball released across the playfield within 12 seconds', () => {
    const stuck = [];
    let released = 0;
    for (let i = 0; i < 27; i++) {
      const x = 32 + i * 12;
      for (const y of [260, 360, 460]) {
        if (inSolid(x, y)) continue;
        for (const vx of [-300, 0, 300]) {
          released++;
          const outcome = release(x, y, vx);
          if (outcome !== 'drain') stuck.push(`(${x}, ${y}) vx=${vx} -> ${outcome}`);
        }
      }
    }
    expect(released).toBeGreaterThan(200);
    expect(stuck).toEqual([]);
  });

  it('leaves a clear gap between the flipper tips of 1.5 to 2.5 ball diameters', () => {
    const t = createTable();
    const tip = (f) => ({ x: f.px + Math.cos(f.angle) * f.length, y: f.py + Math.sin(f.angle) * f.length });
    const left = tip(t.left);
    const right = tip(t.right);
    const clear = Math.hypot(right.x - left.x, right.y - left.y) - t.left.r - t.right.r;
    expect(clear).toBeGreaterThanOrEqual(TABLE.ballRadius * 3);
    expect(clear).toBeLessThanOrEqual(TABLE.ballRadius * 5);
  });
});
```

The upper bound on the gap is deliberate. A gap wide enough to make the table trivial is as much a
defect as one that is closed, and without the bound a future change could "fix" the test by moving
the flippers out of the ball's way entirely.

- [ ] **Step 2: Run it and read the failure carefully**

```bash
npx vitest run src/xp/games/pinball/table.trap.test.js
```

Expected: both tests FAIL. The first lists roughly 243 stuck entries, most of them
`stuck at (200, 661)`. The second reports `9.54` against a minimum of `24`. The run takes about
2 seconds. Write down the exact stuck count; it is the before-number for the final report.

- [ ] **Step 3: Stage**

```bash
git add src/xp/games/pinball/table.trap.test.js
```

### Task B3: Open the drain between the flippers

Root cause of `stuck at (200, 661)`, 84% of all trapped balls.

**Files:**
- Modify: `src/xp/games/pinball/table.js` (`FLIPPER`, `buildWalls`, `createTable`)
- Test: `src/xp/games/pinball/table.test.js`, `src/xp/games/pinball/table.trap.test.js`

**Interfaces:**
- Produces: `FLIPPER.length === 64`, `FLIPPER.rest === 0.5`; flipper pivots at x 122 and 278, y 640.

- [ ] **Step 1: Move the flipper geometry**

In `src/xp/games/pinball/table.js`, change the `FLIPPER` constant:

```js
export const FLIPPER = { length: 64, r: 6, rest: 0.5, raised: -0.5, speed: 24 };
```

and in `createTable`, the two flipper objects:

```js
    left: { px: 122, py: 640, length: FLIPPER.length, r: FLIPPER.r, angle: FLIPPER.rest, omega: 0 },
    right: { px: 278, py: 640, length: FLIPPER.length, r: FLIPPER.r, angle: Math.PI - FLIPPER.rest, omega: 0 },
```

These three numbers move together. Tips land at x = 178.2 and 221.8, giving
`221.8 - 178.2 - 6 - 6 = 31.7px` of clear space, 1.98 ball diameters. Do not change one without
re-running the gap assertion from Task B2.

- [ ] **Step 2: Move the inlane guides to meet the new pivots**

In `buildWalls()`, the first two lines of the `walls` array:

```js
    seg(20, 180, 20, 540), seg(20, 540, 126, 640),             // left wall + inlane guide
    seg(352, 180, 352, 540), seg(352, 540, 274, 640),          // right playfield wall + guide
```

The guide must end level with the pivot, not past it. Ending at `(116, 648)` was measured and
creates a new wedge that catches 14% of balls.

- [ ] **Step 3: Run the trap sweep and expect partial progress**

```bash
npx vitest run src/xp/games/pinball/table.trap.test.js
```

Expected: the gap test now PASSES at 31.7. The sweep still FAILS, but the list is much shorter and
`(200, 661)` is gone. Remaining entries cluster at `(52, 559)` and inside the bank.

- [ ] **Step 4: Repair the flipper fixture in the existing suite**

The test `swings the flippers while held and sends the ball up on contact` places the ball at
`{ x: 160, y: 641 }`, which touched the old flipper at rest but is 17.3 units from the new one.
In `src/xp/games/pinball/table.test.js`, change that line to:

```js
    inPlay(t, { x: 150, y: 641 });
```

`(150, 641)` sits 12.5 units from the new flipper segment, inside the 14-unit contact reach, which
matches the old fixture's relationship to the old flipper.

- [ ] **Step 5: Run the pinball suite**

```bash
npx vitest run src/xp/games/pinball
```

Expected: everything passes except the trap sweep.

- [ ] **Step 6: Stage**

```bash
git add src/xp/games/pinball/table.js src/xp/games/pinball/table.test.js
```

### Task B4: Lift the slingshots clear of the inlane guides and mirror the right one correctly

Root cause of `stuck at (52, 559)`: 11px of headroom between the left slingshot's bottom edge and the
guide beneath it. Root cause of the right-hand pocket at `(348, 537)`: a 12px channel between the
right slingshot body at x = 340 and the right playfield wall at x = 352. Both live on the same lines,
so they move together.

**Files:**
- Modify: `src/xp/games/pinball/table.js` (`buildWalls`, `createTable`)
- Test: `src/xp/games/pinball/table.test.js`

- [ ] **Step 1: Raise both slingshot bodies and move the right one inboard**

In `buildWalls()`:

```js
    seg(60, 470, 60, 530), seg(60, 530, 105, 530),             // left slingshot body
    seg(312, 470, 312, 530), seg(312, 530, 267, 530),          // right slingshot body
```

and in `createTable`:

```js
    slingshots: [{ seg: seg(60, 470, 105, 530, 3), flash: 0 }, { seg: seg(312, 470, 267, 530, 3), flash: 0 }],
```

Left slingshot: unchanged in x, raised 30 units. Right slingshot: raised 30 units and moved from
x 340/295 to x 312/267, which mirrors the left one about the playfield centre at x = 186 instead of
the table centre at x = 200.

- [ ] **Step 2: Repair the slingshot fixture in the existing suite**

`scores bumpers and slingshots and kicks the ball away` places the ball 10 units off the old
diagonal. In `src/xp/games/pinball/table.test.js`, change:

```js
    inPlay(t, { x: 90, y: 524, vx: -100 });          // 10 units off the diagonal (60,500)->(105,560), moving into it
```

to:

```js
    inPlay(t, { x: 90, y: 494, vx: -100 });          // 9.6 units off the diagonal (60,470)->(105,530), moving into it
```

- [ ] **Step 3: Run the pinball suite**

```bash
npx vitest run src/xp/games/pinball
```

Expected: `scores bumpers and slingshots` passes. The trap sweep's `(52, 559)` entries are gone;
only bank-related entries should remain, if any.

- [ ] **Step 4: Stage**

```bash
git add src/xp/games/pinball/table.js src/xp/games/pinball/table.test.js
```

### Task B5: Assert both outlanes are wide enough to stay wide

Task B4 moved the right slingshot. This task pins that result down with its own assertion, because
the 12px channel is the pocket in the player's second screenshot and it should not be able to come
back silently.

**Files:**
- Test: `src/xp/games/pinball/table.trap.test.js`

- [ ] **Step 1: Write the test**

Append inside the existing `describe` block in `src/xp/games/pinball/table.trap.test.js`:

```js
  it('gives both outlanes room for the ball between the wall and the slingshot', () => {
    const t = createTable();
    const bodies = t.walls
      .filter((w) => w.ax === w.bx && w.ay === 470 && w.by === 530)
      .sort((a, b) => a.ax - b.ax);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].ax - 20).toBeGreaterThanOrEqual(TABLE.ballRadius * 4);   // left wall sits at x=20
    expect(352 - bodies[1].ax).toBeGreaterThanOrEqual(TABLE.ballRadius * 4);  // right playfield wall at x=352
  });
```

- [ ] **Step 2: Run it**

```bash
npx vitest run src/xp/games/pinball/table.trap.test.js
```

Expected: PASS — 40 units on each side against a 32-unit minimum. If it fails, the slingshot x
values from Task B4 were not applied.

- [ ] **Step 3: Stage**

```bash
git add src/xp/games/pinball/table.trap.test.js
```

### Task B6: Slope the drop-target bank so nothing rests on it

Root cause of `stuck at (32...56, 267)`: a horizontal ledge with a wall at one end.

**Files:**
- Modify: `src/xp/games/pinball/table.js` (`buildWalls`, `createTable`)

- [ ] **Step 1: Tilt the top edge**

In `buildWalls()`:

```js
    seg(20, 268, 60, 280), seg(60, 280, 60, 365), seg(60, 365, 20, 365),   // drop-target bank block
```

The top now falls 12 units to the right, away from the wall, so a ball landing on it always rolls
back into play.

- [ ] **Step 2: Follow it with the drawn fill**

In `createTable`, the rect that `render.js:88` fills:

```js
    bank: { x: 20, y: 268, w: 40, h: 97 },
```

This is cosmetic only; no collision code reads `bank`.

- [ ] **Step 3: Run the pinball suite**

```bash
npx vitest run src/xp/games/pinball
```

Expected: PASS, including the trap sweep, whose `stuck` array should now be empty.

- [ ] **Step 4: Look at it**

```bash
npm run dev
```

Open Pinball. Confirm the translucent bank panel still sits behind the three magenta targets and its
top edge matches the cyan line above it.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/pinball/table.js
```

### Task B7: Add a jam detector so no future pocket can lock the game

Everything above fixes pockets we found. This makes an unfound pocket survivable. It also covers the
two rare cases the geometry work does not reach: a ball that tunnels into the sealed bank interior,
and one that comes to rest at the top of the plunger lane near `(370, 168)`.

Real machines call this a ball search. Deterministic, so it stays testable: no `Math.random`.

**Files:**
- Modify: `src/xp/games/pinball/table.js` (`createTable`, `drain`, `stepTable`), `src/xp/games/pinball/Pinball.js:9`
- Test: `src/xp/games/pinball/table.test.js`

**Interfaces:**
- Produces: `t.stillFor` (seconds), `t.searches` (count for the current ball), and two new event
  types, `{ type: 'ballSearch' }` and `{ type: 'ballLost' }`.

- [ ] **Step 1: Write the failing tests**

Add to `src/xp/games/pinball/table.test.js`, inside the existing `describe('table')` block:

```js
  it('shakes a motionless ball loose after a few seconds', () => {
    const t = createTable();
    inPlay(t, { x: 200, y: 400 });
    let events = [];
    for (let i = 0; i < 240 * 3; i++) {
      Object.assign(t.ball, { x: 200, y: 400, vx: 0, vy: 0 });   // pin it: stands in for a perfect wedge
      events = events.concat(stepTable(t, DT, NO_INPUT));
    }
    expect(types(events)).toContain('ballSearch');
  });

  it('gives up on a ball that cannot be shaken loose and counts it as drained', () => {
    const t = createTable();
    inPlay(t, { x: 200, y: 400 });
    let events = [];
    for (let i = 0; i < 240 * 15; i++) {
      Object.assign(t.ball, { x: 200, y: 400, vx: 0, vy: 0 });
      events = events.concat(stepTable(t, DT, NO_INPUT));
      if (types(events).includes('ballLost')) break;
    }
    expect(types(events)).toContain('ballLost');
    expect(types(events)).toContain('drain');
    expect(t.ballNumber).toBe(2);
  });

  it('does not shake a ball that is simply moving slowly', () => {
    const t = createTable();
    inPlay(t, { x: 200, y: 300, vx: 60 });
    let events = [];
    for (let i = 0; i < 240 * 3; i++) events = events.concat(stepTable(t, DT, NO_INPUT));
    expect(types(events)).not.toContain('ballSearch');
  });
```

The first two fixtures pin the ball every step. That is the only honest way to simulate a wedge
without depending on a specific pocket, and it keeps the tests valid after the geometry changes
above. Note that `DT` in this file is `1/240`, matching the loop.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run src/xp/games/pinball/table.test.js
```

Expected: the first two FAIL (no such event type is ever emitted), the third passes vacuously.

- [ ] **Step 3: Add the state**

In `createTable`, extend the first state line with two fields:

```js
    state: 'playing', time: 0, score: 0, ballNumber: 1, ballsTotal: 3, extraBallAwarded: false, tilt: false, nudges: [],
    stillFor: 0, searches: 0,
```

- [ ] **Step 4: Reset it on every new ball**

In `drain()`, beside the existing `t.tilt = false;`:

```js
  t.stillFor = 0;
  t.searches = 0;
```

- [ ] **Step 5: Add the detector**

In `stepTable`, immediately before the final drain check
(`if (ball.y - ball.r > TABLE.height + 30) drain(t, events);`):

```js
  const speed = Math.hypot(ball.vx, ball.vy);
  if (!ball.atRest && speed < 30) t.stillFor += dt; else t.stillFor = 0;
  if (t.stillFor > 2.5) {
    t.stillFor = 0;
    t.searches++;
    if (t.searches > 3) { events.push({ type: 'ballLost' }); drain(t, events); return events; }
    ball.vx = ball.x < TABLE.width / 2 ? 140 : -140;   // shove toward the middle of the table
    ball.vy = -260;
    events.push({ type: 'ballSearch' });
  }
```

A ball rolling down any slope on this table passes 30 px/s well inside 2.5 s, so only a genuine wedge
accumulates. Three shoves, then the table gives the ball up rather than hanging.

- [ ] **Step 6: Run the tests and make sure they pass**

```bash
npx vitest run src/xp/games/pinball
```

Expected: PASS, all files, trap sweep included.

- [ ] **Step 7: Give the two new events a sound**

In `src/xp/games/pinball/Pinball.js:9`, extend `SOUND_FOR` with the two new keys:

```js
const SOUND_FOR = { flipper: 'flipper', bumper: 'bumper', slingshot: 'bumper', target: 'target', letter: 'target', bank: 'win', word: 'win', extraBall: 'win', drain: 'drain', launch: 'click', tilt: 'error', nudge: 'menu', ballSearch: 'menu', ballLost: 'error' };
```

- [ ] **Step 8: Stage**

```bash
git add src/xp/games/pinball/table.js src/xp/games/pinball/table.test.js src/xp/games/pinball/Pinball.js
```

### Task B8: Play the table and check the whole suite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run everything**

```bash
npm test
```

Expected: PASS, with no skipped files. If the room or boot suites fail, they are unrelated to this
plan — stop and report rather than adjusting them.

- [ ] **Step 2: Play it**

```bash
npm run dev
```

Open Pinball and confirm, by hand:

1. Hold Space to full charge, release. The ball clears the gate and enters the playfield.
2. Let it come down untouched. It drains between the flippers, the ball counter advances, and a new
   ball appears in the lane.
3. Flip with Z and the forward slash key. Both flippers reach the ball and return it up the table.
4. Send a ball down each outlane. It rides the guide onto the flipper without catching.
5. Hit both slingshots. Each flashes, scores 50 and kicks the ball away.
6. Play three balls to game over. The dialog appears and F2 starts a new game.
7. Nothing sticks. If anything does, note the coordinates drawn on the canvas and add that start
   state to the sweep in `table.trap.test.js` before fixing it.

- [ ] **Step 3: Record the QA items**

In `README.md`, add to the pinball QA checklist:

```markdown
- A ball released anywhere on the playfield drains within 12 s (`table.trap.test.js`).
- The clear gap between the flipper tips at rest is 1.5 to 2.5 ball diameters.
- Both outlanes are at least 4 ball radii wide between the wall and the slingshot body.
- A wedged ball is shaken loose within 2.5 s and given up after three attempts.
- The homepage banner shows no grey blocks: the visitor counter digits are character-sized.
```

- [ ] **Step 4: Stage**

```bash
git add README.md
```

- [ ] **Step 5: Report**

Summarise for Stephen: the before-number from Task B2 (balls stuck out of balls released), the
after-number, and the four pockets that are now closed. Do not commit; wait for him to say so.

---

## Self-Review

**Coverage.** Grey marquee blocks: A1. Reduced-motion gap found along the way: A2. "Ball never drops
down in the middle": B3. "These 2 corners will stuck the ball": B4 closes both, B5 pins the right one
down. Two further pockets found by sweep that the player had not yet hit: B6 and B7. The harness that
proves all of it: B1, B2, B8.

**No placeholders.** Every step carries the literal code or command. The numbers in B3 and B4 are the
ones measured at 96.3% drain in the evidence section, not estimates.

**Consistency.** `STEP` is exported in B1 and consumed in B2 and B7. `marquee-text` is introduced in
A1 and reused in A2. `stillFor`, `searches`, `ballSearch` and `ballLost` are defined in B7 and used
nowhere earlier. The slingshot x change appears once, in B4, and is asserted in B5.

**Open choice for Stephen.** The drain gap in B3 is set to 1.98 ball diameters. Wider drains more
often and plays easier; narrower plays harder and risks bringing the perch back. The test in B2
accepts anything from 1.5 to 2.5 diameters, so the value can be retuned inside that band without
touching any other task.
