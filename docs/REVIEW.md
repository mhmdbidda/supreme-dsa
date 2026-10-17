# Final Audit — DSA Command Center (commit `fbf19d4`)

**Run evidence:** `npm run check` → lint ✔, `tsc --noEmit` ✔, **238/238 tests ✔** (12 files), build ✔ (11 static routes). `eslint . --max-warnings=0` exits **0** (no warnings). `npm audit` → **7 vulnerabilities (6 high, 1 moderate)**, all dev/build-chain. `npm start` + live HTTP checks on `/` and `/no-such-page` → 200/404 with full header set. Git tree clean at audit start.

## Scorecard

| Area | Score | One line |
|---|---|---|
| Functional correctness | 8/10 | Every engine correct on the edge cases exercised (empty, single, duplicates, unsorted, refused inputs); one empty-state copy bug and a cancel-at-zero edge. |
| Playback logic | 9/10 | Reducer bounds/reset/restart correct and unit-tested; every consumer supplies stable step arrays (verified `useMemo`/state per lab). |
| UI & design consistency | 8/10 | One disciplined token system; two residual contrast defects and a shared-error-panel nit. |
| Accessibility | 7/10 | Skip link, focus trap, live regions, `aria-pressed`, reduced-motion all real — but AA text failures remain and ~9 scroll regions are keyboard-unreachable. |
| Performance & memory | 7/10 | Benchmark and graph caps in place; 4 096-cell matrix re-renders on every pointer-move drag, per-step O(n) tree copies in the explorer. |
| Reliability & error handling | 8/10 | Nothing throws; every mutation refuses with a message; localStorage/URL input validated; deep-recursion crash only via extreme manual input. |
| Maintainability & code quality | 8/10 | Clean pure-algorithm layer (grep-verified no React/DOM/window/localStorage in `src/algorithms`), strict TS, zero `any`/`@ts-ignore`; some layout duplication. |
| Security | 8/10 | Headers verified live, CSV injection fixed, no XSS sinks, hardened parsing — minus 2 for the audit backlog and `X-Powered-By`. |
| Testing | 7/10 | Strong pure-layer suite incl. CSV/validation/playback; **zero component or a11y tests** — the exact layer the recent fixes touched. |
| Vercel / SEO readiness | 8/10 | Fully static, per-route metadata + OG/twitter, headers apply at the edge; Node 20 pinned; one build-time advisory chain. |

## Verification of the 12 previous fixes

| # | Fix | Verdict | Evidence |
|---|---|---|---|
| 1 | Desktop sidebar inert | **Verified** | `Sidebar.tsx:44-46` (`inert={!isDesktop && !open}`), dialog semantics gated on `isModal`; new `useIsDesktop.ts:16-31` (commit `d4f0b83`). Residual: served SSR HTML has no `inert` (default-true), so a phone user's tab order touches the off-screen drawer between parse and hydration — L3. |
| 2 | Linked-list reverse snapshots | **Verified** | `linkedList.ts:288-344`: walk snapshots keep original order + `current`; final snapshot is the true reversed structure; +28 lines of tests in `d4f0b83`. |
| 3 | Security headers | **Verified live** | `next.config.mjs:38-52`; curl on `/` and `/no-such-page` returns `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, full CSP on both. Residual: `X-Powered-By: Next.js` still sent — L1. |
| 4 | Uncapped graph vertices | **Verified** | `graph.ts:22,186-190` refuses at `MAX_GRAPH_VERTICES = 64`; UI surfaces refusal (`GraphStudio.tsx:404-410`, `fieldError`). |
| 5 | CSV formula injection | **Verified** | `benchmark.ts:433-448` neutralises `= + - @ \t \r` for non-numeric cells; `tests/benchmark.test.ts:344-411` asserts the escaping. |
| 6 | Unknown `?run=` notice | **Verified** | `BenchmarkCenter.tsx:158-183,370-385` shows a visible not-found banner; `ComplexityLab.tsx:23-27` switches mode post-hydration; id is `encodeURIComponent`-ed (`RecentExperiments.tsx:117`). One re-open quirk — L8/M8. |
| 7 | Keyboard graph deletion | **Verified** | `GraphStudio.tsx:848-929` (delete forms), `443-491` (handlers), `932-940` polite status region. |
| 8 | Contrast issues | **Partial** | `-ink` siblings added (`globals.css:13-19`) and used in `BarChart.tsx:94,98` (computed 6.0-6.5:1 ✔). But `text-sorted` (#55805f) is still used **as text** at `page.tsx:68` and `RecursionVisualizer.tsx:57,66,463,477,482` — computed **4.00:1** on `#161616`, **4.17:1** on `#111` → AA fail. This is finding **H1**. |
| 9 | window.prompt | **Verified** | Zero matches for `prompt/alert/confirm` in `src`; values come from inline fields (`GraphStudio.tsx:309-316`, `DataStructuresLab.tsx:383-416`). |
| 10 | Dead code | **Verified** | Removed in `24f35b3` (`bst.ts` −71, `recorder.ts` −5); current tree passes `--max-warnings=0` and strict TS with `noUnusedLocals/Parameters`. |
| 11 | Dashboard copy | **Verified** | `page.tsx:27-63` rewritten modules, consistent with README and `about/page.tsx:11-37`; `docs/COUNTERS.md` matches code counter-for-counter (spot-checked stack/queue/list/trees/graphs/recursion). |
| 12 | Play-at-end | **Verified** | `usePlayback.ts:74-77` restarts from 0; Play not disabled at end (`PlaybackControls.tsx:62-65`); reducer covered in `tests/usePlayback.test.ts`. |

## Findings

### Critical
None.

### High
**H1 — WCAG AA contrast failures on remaining `text-sorted` text** — `src/app/page.tsx:68`; `src/components/visualizers/RecursionVisualizer.tsx:57,66,463,477,482`
What: #55805f text at 9-12px on `#161616`/`#111` computes to 4.00:1 / 4.17:1 (measured with the WCAG relative-luminance formula), below 4.5:1. This is the "Ready" dashboard chip, call-frame return values, 9px "base case" badges and "popped" labels. Why: the contrast fix (`fbf19d4`) added `--color-sorted-ink` #6fa077 (6.0:1) but wired it only into `BarChart`; the same defect class survives in two other components — an incomplete fix, not a regression. Fix: swap `text-sorted` → `text-sorted-ink` in exactly those five text spots (icons at `RecursionVisualizer.tsx:623`, `SortingLab.tsx:526,542` are graphical and already pass 3:1).

### Medium
**M1 — No component/DOM tests at all** — `vitest.config.mts:5` (`environment: "node"`), no Testing Library dependency
What: 238 tests cover only the pure layer. Why: the entire recent fix batch (drawer focus trap, graph keyboard delete, `?run=` notice, contrast) lives in components and can regress silently; `about/page.tsx:187` admits "verified by hand". Fix: add jsdom + Testing Library and 5-8 smoke tests for the sidebar drawer, graph delete forms, missing-run banner, ReadyBadge classes.

**M2 — Keyboard-unreachable scroll containers (~9 sites)** — `TreeExplorer.tsx:335`; `DataStructuresLab.tsx:299`; `GraphStudio.tsx:1126`; `BenchmarkCenter.tsx:616,716`; `LinkedListVisualizer.tsx:54`; `QueueVisualizer.tsx:45`; `RecursionVisualizer.tsx:437,519`; `about/page.tsx:162`
What: `overflow-auto`/`overflow-x-auto` wrappers with no `tabindex`. Why: at 360px the `min-w-[560px]` tables and the linked-list row definitely overflow; a keyboard-only user cannot scroll to the hidden content (WCAG 2.1.1/1.4.10). Fix: add `tabIndex={0}` + `role="group"`/`aria-label` to each wrapper.

**M3 — Unbounded BST / linked-list growth** — `bst.ts:579-598,615`; `TreeExplorer.tsx:145-147`; `linkedList.ts` (no cap)
What: every step deep-copies the whole tree, and TreeExplorer recomputes `countNodes()`/`measureHeight()`/`toSnapshot()` on **every render**; helpers recurse to tree depth with no cap, while the docs advertise sorted inserts degenerate the tree (`trees/index.ts:30`). Why: a long run of manual sorted inserts makes each operation O(n) copies + depth-n recursion; ~10k depth throws `RangeError` (caught by the error boundary, but the lab dies). Reachability is manual-insert-only (sample path is fixed, RecursionVisualizer caps at 30) — a robustness gap, not an exploitable DoS. Fix: mirror the graph's pattern — `MAX_TREE_NODES`/`MAX_LIST_LENGTH` refusal + memoize stats on `version`.

**M4 — 4 096-cell adjacency matrix re-renders on every pointer-move** — `GraphCanvas.tsx:249-264` → `GraphStudio.tsx:1109-1165`
What: matrix open by default (`showMatrix=true`); vertex drag fires `setPositions` per move, re-diffing a 64×64 table (`useMemo` only stabilizes the object identity, React still reconciles the cells); typing in the id fields re-renders it too. Why: measurable jank at the cap the code itself sets. Fix: default-collapse the matrix above ~24 vertices, and/or keep drag positions in GraphCanvas-local state.

**M5 — 7 npm audit vulnerabilities (6 high, 1 moderate)** — `node_modules/braces` chain via `eslint-config-next`; `next/node_modules/postcss`
What: braces stack-exhaustion (dev-only lint path) and the postcss sourceMappingURL/`</style>` advisories (build-time, trusted input). Why: no runtime surface for a fully static export, but the report is red and both fixes are breaking (`eslint-config-next@14.2.35`, `next@16.4.2`). Fix: add `overrides` for `braces`/`postcss` to patched minors, re-run `npm audit`, and note the residual in the README rather than force-upgrading Next.

### Low
**L1** — `X-Powered-By: Next.js` still emitted (verified in live headers) → add `poweredByHeader: false` in `next.config.mjs`.
**L2** — Empty-tree state renders the same sentence twice: `TreeVisualizer.tsx:113-116` splits on `" — "`, but `bst.ts:186`'s snapshot message has no dash, so heading == body. (`bst.ts:190`'s error string does have the dash — only the snapshot copy is affected. `LinkedListVisualizer.tsx:20-23` has the same latent pattern.)
**L3** — Pre-hydration mobile drawer is not `inert` (SSR default `isDesktop=true`, `useIsDesktop.ts:17`; confirmed in served HTML) — brief tab-into-invisible-sidebar window on phones.
**L4** — Placeholder text ~2.7:1 (`placeholder:text-ink-muted/60` on `#161616`): `SortingLab.tsx:298`, `GraphStudio.tsx:1019`, `DataStructuresLab.tsx:187`, `RecursionVisualizer.tsx:232`.
**L5** — Matrix zero cells `text-ink-muted/50` ≈ 2.3:1 at 11px (`GraphStudio.tsx:1137,1148`); edge cells pass (5.6:1).
**L6** — One shared `fieldError` + `aria-describedby` for all four graph edit forms (`GraphStudio.tsx:1046-1058`, panel at `947-955`): an error from one input is announced on the other three and rendered below the whole grid.
**L7** — Cancelling before the first trial shows "No measurements yet" instead of a cancelled notice (`BenchmarkCenter.tsx:246`: `wasCancelled = collected.length > 0 && cancelRef.current`).
**L8** — Chart series come from current selection state, not from the run (`BenchmarkCenter.tsx:215-233`): deselecting an algorithm after a run drops its line while its table rows remain.
**L9** — Weight-parse failure clears the pending edge source (`GraphStudio.tsx:306` runs before the parse at `309-315`), forcing a re-click.
**L10** — `ComplexityLab` mode toggling remounts `BenchmarkCenter`, whose `[]`-effect re-reads `?run=` and re-opens the saved run, discarding config edits made since (`ComplexityLab.tsx:23-27` + `BenchmarkCenter.tsx:171-183`).
**L11** — Hard-coded `id="speed"` in `PlaybackControls.tsx:96` — unique today, a duplicate-ID trap if a second lab lands on one page.
**L12** — Layout duplication: the `grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]` lab shell is copy-pasted across five labs, and the empty-state block appears four times — extract once.

*Unverified:* actual pixel rendering at 360/768/1280 (no browser in this environment) — responsive behavior is verified only from class logic and served HTML.

## Verified OK
- All 12 prior fixes are real commits touching the right files (`d4f0b83`, `306ca43`, `24f35b3`, `fbf19d4`); none is a no-op.
- Algorithm correctness: bubble (early exit, sorted-marking), merge (stability, tail-copy writes), linear/binary search (unsorted refusal, empty window), stack/queue/list (underflow, tail/head maintenance), BST (all three delete cases, duplicate rejection), BFS/DFS (frontier/visit order, refusal paths) — edge cases exercised, counters match `docs/COUNTERS.md` exactly.
- Fast-mode parity: `fastMode.ts` mirrors stepped versions counter-for-counter, asserted by `tests/benchmark.test.ts`.
- Snapshot immutability everywhere (fresh arrays/objects per step in all six engines); no aliasing corruption found.
- Security posture: no `dangerouslySetInnerHTML`/`eval`/`innerHTML` anywhere; CSP/`XFO`/`nosniff`/`Referrer-Policy` verified on 200 and 404; localStorage fully validated (`isBenchmarkRun`, `tests/benchmark.test.ts:433-472`); `?run=` id length-capped and encoded; CSV formula neutralisation tested; benchmark sizes/trials/seed all clamped.
- Architecture: zero React/DOM/window/localStorage references inside `src/algorithms` (grep-verified); strict TS with `noUnusedLocals/Parameters`; zero `any`/`@ts-ignore`; `eslint --max-warnings=0` clean.
- Accessibility baseline: skip link (`layout.tsx:56`), drawer focus trap + Escape (`AppShell.tsx:33-69`), `role="status"`/`aria-live` regions in all five labs, `aria-pressed` segmented controls, labelled range sliders, reduced-motion CSS + hook gating Recharts animation, error/empty states with `role="alert"`/`role="status"`.
- SEO/Vercel: per-route metadata incl. 404, `metadataBase` + OG/Twitter, fully static build, headers apply via `headers()` (works on Vercel), Node 20 pinned.

## Prioritized fix plan (small batches)
1. **Batch A — contrast (15 min, closes H1+L4+L5):** `text-sorted` → `text-sorted-ink` at the five text sites; placeholder opacity `/60` → full `ink-muted`; matrix zeros `/50` → `/70`. Then `npm run check`.
2. **Batch B — keyboard scroll (30 min, closes M2):** `tabIndex={0}` + labelled `role="group"` on the nine overflow wrappers.
3. **Batch C — robustness (1 h, closes M3):** `MAX_TREE_NODES`/`MAX_LIST_LENGTH` refusals mirroring the graph cap, with tests; memoize TreeExplorer stats on `version`.
4. **Batch D — perf (1 h, closes M4):** matrix default-collapsed above ~24 vertices; drag positions local to GraphCanvas.
5. **Batch E — polish (~1 h, closes L1-L2, L6-L10):** `poweredByHeader: false`, empty-tree message dash, per-form error ids, cancel-at-zero notice, chart series from the run, keep pending edge on weight typo, guard the `?run=` effect against remount re-opens.
6. **Batch F — deps & tests (1-2 h, closes M1+M5):** `overrides` for `braces`/`postcss`, re-audit; add jsdom + Testing Library smoke tests for drawer, delete forms, missing-run banner, ReadyBadge.

## 5-line summary
The twelve earlier fixes are all real, tested where it matters, and match their commits — only the contrast fix is partial: five small-text `text-sorted` uses still fail WCAG AA at ~4.0:1 (H1). The pure algorithm layer is genuinely solid: correct edge cases, immutable snapshots, exact counters, strict types, no `any`, no DOM leakage, and a clean zero-warning lint. Main gaps are around it: no component tests, nine keyboard-unscrollable overflow regions, unbounded tree/list growth with per-render O(n) copies, and a 4 096-cell matrix re-rendered during drags. Security is in good shape (headers verified live, CSV/URL/localStorage hardened) with 7 build-chain audit findings and `X-Powered-By` the only loose ends. Nothing is Critical; six small batches — contrast first — would take this to a clean bill.
