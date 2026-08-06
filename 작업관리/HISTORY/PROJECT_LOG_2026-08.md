# PROJECT_LOG_2026-08

Version : v1.10  
Period : 2026-08  
Status : Active Project Log

---

# 2026-08-06 (Search Engine Enhancement Phase — KDTree 완료)

## 제목

**Mission 36 — KDTree Layer for Envelope Candidates**

## Summary

Mission 35의 Spatial Index 후보 집합을 입력으로 consume하는 KDTree 계층을 구현하였다. EnvelopeRecord는 cue centroid / target / second centroid 기반의 고정 6D 벡터로 encoding되며, KDTree는 deterministic top-N nearest shortlist만 반환하고 Membership 판정·Ranking·Geometry 계산은 수행하지 않는다.

## Architecture Review 요약

- Spatial Index는 coarse prefilter, KDTree는 shortlist retrieval로 책임을 분리한다.
- Encoding은 tree build/query와 분리하여 `search/kd_tree/encoding.py`에 고정한다.
- EnvelopeRecord는 set-valued(`cueSet`, `secondSet`) 구조이므로, KDTree coarse retrieval에서는 centroid representative를 사용한다.
- Tie-break는 `candidate_id` 오름차순으로 고정하여 동일 입력에 동일 순서를 보장한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| KDTree Contract | `search/kd_tree/contract.py` | 6D 고정 차원 |
| Point Encoding | `search/kd_tree/encoding.py` | query direct / record centroid encoding |
| KDTree Builder | `search/kd_tree/builder.py` | 후보 집합 → KDTreeIndex |
| KDTree Query API | `search/kd_tree/query.py` | top-N nearest shortlist |
| Fixture / Smoke | `search/kd_tree/fixtures.py`, `tests/test_kd_tree*.py` | tie-break · Spatial Index 연동 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| KDTree unit tests | **PASS** |
| KDTree smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- Spatial Index 후보 집합으로 KDTree 생성 성공
- Query와 Record를 동일 6D contract로 encoding
- Query → Top-N nearest shortlist 반환 성공
- 결과에 `candidate_id`, `strategy_ref`, `distance`, deterministic tie-break metadata 포함
- Membership 계약 변경 없음
- PublishedDataset / Generator 수정 없음

## Explicit Non-Claims

- Membership Optimization Integration **미구현**
- Ranking / Interpolation / Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Persisted KDTree / Dataset index field **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 37 — Membership Optimization** — KDTree shortlist consume

---

# 2026-08-06 (Search Engine Enhancement Phase — Spatial Index 완료)

## 제목

**Mission 35 — Spatial Index Design & Contract**

## Summary

Search Engine Enhancement Phase의 첫 단계로 Spatial Index 계층을 구현하고 coarse prefilter contract를 검증하였다. Spatial Index는 PublishedDataset로부터 런타임에 파생되는 memory-only index이며, PublishedDataset / Generator / Foundation Consumer 계약은 변경하지 않았다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Spatial Index Builder | `search/spatial_index/builder.py` | PublishedDataset → SpatialIndex |
| Spatial Cell Contract | `search/spatial_index/contract.py` | 8×4 grid |
| Spatial Query API | `search/spatial_index/models.py` | `SpatialQuery` / `SpatialQueryResult` |
| Fixture / Smoke | `tests/test_spatial_index*.py` | PublishedDataset 기반 coarse prefilter 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| Spatial Index unit tests | **PASS** |
| Spatial Index smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset로부터 Spatial Index 생성 성공
- Spatial Cell 생성 성공
- Query → Candidate ID 반환 성공
- Runtime-derived only 유지
- PublishedDataset 수정 없음
- Generator 수정 없음
- Foundation 계약 변경 없음

## Explicit Non-Claims

- KDTree **미구현**
- Membership 변경 **없음**
- Ranking / Interpolation / Geometry **미구현**
- Runtime wiring **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 36 — KDTree** — Membership 후보 접근 최적화

---

# 2026-08-06 (Dataset Generator Phase 완료)

## 제목

**Dataset Generator Phase Complete**

## Summary

Envelope Architecture Freeze SSOT 계약을 유지한 상태에서 Dataset Generator Phase 구현을 완료하였다. Generator Producer 계층은 Strategy 입력으로부터 PublishedDataset을 생성하며, 기존 Foundation Consumer(Validation / Loader / Membership)가 그 결과를 그대로 consume할 수 있음을 E2E로 검증하였다. **Architecture Freeze 문서·Foundation Consumer 계층·Schema/Models 계약은 수정하지 않았고, Commit/Push도 수행하지 않았다.**

## 구현 내역 (Generator Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Trajectory Generator | `generator/trajectory_generator/` | Strategy → TrajectorySnapshot |
| Cue Sampler | `generator/cue_sampler/` | `cue_trajectory` → `cueSet` |
| Second Sampler | `generator/second_sampler/` | `line_of_score` → `secondSet` |
| Envelope Builder | `generator/envelope_builder/` | Strategy + Snapshot + Sets → EnvelopeRecord |
| Published Dataset Builder | `generator/published_dataset_builder/` | EnvelopeRecord[] → PublishedDataset |
| Generator Pipeline E2E | `tests/test_generator_pipeline_e2e.py` | Validation → Loader → MembershipCandidate |

## 검증

| Suite | 결과 |
|-------|------|
| Generator unit/smoke tests | **PASS** |
| Generator Pipeline E2E | **PASS** |
| Validation Layer | **PASS** |
| Loader 연동 | **PASS** |
| MembershipCandidate 생성 | **PASS** |
| Round-trip (`load` / `load_path`) | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset 생성 성공
- Validation PASS
- Loader가 PublishedDataset를 정상 Load
- PublishedDataset Model 유지
- Membership 입력 가능
- MembershipCandidate 반환 확인
- Generator Phase 종료

## Explicit Non-Claims

- Architecture / Schema / Models 의미 변경 **없음**
- Foundation Consumer (Loader / Membership / Resolve / Runtime) 수정 **없음**
- Ranking / Interpolation / KDTree / Spatial Index / Geometry 실계산 **미구현**
- Package Emit **미구현**
- Git Commit / Push **없음**

## Next

**Search Engine Enhancement Phase** — Spatial Index · KDTree · Membership Optimization · Ranking Engine · Interpolation Engine · Geometry Engine · Search Quality Tuning

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | Dataset Generator Phase Complete · Next Search Engine Enhancement Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.8** |
| `CURSOR_SESSION_HANDOFF.md` | Generator Phase Complete · Next Search Engine Enhancement Phase |

---

# 2026-08-06 (Search Engine Foundation Phase 완료)

## 제목

**Search Engine Foundation Phase 완료**

## Summary

Envelope Architecture Freeze SSOT 계약에 따라 Search Engine Foundation Phase 구현을 완료하고, 작업관리 문서에 상태를 반영하였다. **Architecture Freeze 문서·기존 SSOT 본문·구현 코드는 본 문서 세션에서 수정하지 않았다. Commit 없음.**

## 구현 내역 (Foundation Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Schema | `schemas/` | Published Dataset · Package · Manifest · Version · Membership Candidate |
| Domain Models | `models/` | EnvelopeRecord · PublishedDataset · Package · Manifest · Version · MembershipCandidate |
| Validation Layer | `validation/` | jsonschema Draft 2020-12 · schema registry |
| Package Loader | `loader/` | Package → Validation → PublishedDataset |
| Membership Engine | `membership/` | PublishedDataset + Query → MembershipCandidate[] |
| Resolve Engine | `resolve/` | MembershipCandidate.strategy_ref → Strategy |
| Search Runtime | `runtime/` | Host: Membership → Resolve → SearchResult |
| Search Session | `session/` | 1회 Execution Context · SearchResult 재사용 |
| Strategy Repository | `strategy/` | Read-only MemoryStrategyRepository · FrozenStrategy Handle |
| Strategy Engine | `strategy_engine/` | Strategy Handle → StrategyExecution |
| Modal Engine | `modal/` | StrategyExecution → ModalExecution |
| Geometry Engine | `geometry/` | ModalExecution → GeometryContext (**계산 미구현 · Context only**) |

## 테스트

| Suite | 결과 |
|-------|------|
| Validation / Loader / Membership / Resolve / Runtime / Session / Strategy Repository / Strategy Engine / Modal / Geometry smoke tests | **PASS** (각 Mission 기준) |

## Architecture Freeze

- `Architecture/` Envelope Architecture SSOT **유지** (내용 수정 없음)
- Schema / Models / 기존 Consumer 계층 Freeze 계약 준수
- Generator · Ranking · KDTree · 실제 Geometry 계산 · Search Algorithm — **본 Phase 비범위**

## Explicit Non-Claims

- Dataset Generator Phase — **미착수**
- Architecture / Schema / Models 문서·코드 변경 — **없음** (본 문서 세션)
- Git Commit / Push — **없음**

## Next

**Dataset Generator Phase** — Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | v1.56 → **v1.57** · Foundation Phase 완료 · Next Generator Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.7** |
| `CURSOR_SESSION_HANDOFF.md` | Foundation 완료 · Generator Phase 이관 · cueSet/secondSet 정의 |

---

# 2026-08-04 (Reading Mode + C2 Reflection Rail Handle — 구현 완료 · 문서 반영)

## 제목

**D-DBP-16 / D-DBP-17 / D-DBP-18** — Reading Mode Implemented · C2 Reflection Rail Handle Implemented · Corner Cap Override

## Summary

이번 세션에서 USER Overlay **Reading Mode**와 ADMIN **C2 Reflection Rail Handle**을 구현·검증하고, Display Boundary Policy SSOT / MASTER INDEX / 본 로그에 완료 상태를 반영하였다. **본 항목의 문서 업데이트는 코드 수정 없음 · Commit/Push 없음.**

## 작업 로그 (시간순)

### ■ Reading Mode UX

- UX 설계 · SSOT §15 작성 (선행 v1.3)
- Overlay 확대: Max Height = Table Inner Height
- Typography × `ReadingFontScale=1.45`
- Aspect 유지 · 우측 상단 돋보기(+/-) 토글
- Backdrop 강화 · 내부 Scroll
- USER Overlay Shell only · Overlay 종료 시 OFF · Persistence 없음
- 구현: `UserOverlayShell.jsx` · `overlayLayoutTokens.ts` · `index.css`

### ■ Reading Mode 개선

- AI Overlay Width 계산 수정 — kind별 **originalAspect**
- AI/HPT: `AI_OVERLAY_ASPECT_RATIO`(6:4) · CALC: max-box aspect
- 줄바꿈 감소
- Reading Mode 토글 시 **Overlay Center 유지** (Drag/clamp 로직 비변경)

### ■ Reflection Handle (C2)

- ADMIN 전용 C2 Rail Handle (작은 노란 점)
- 1D Rail Drag · Rail Snap · `{ rail, t }` Persist (`reflectionOverride`)
- Builder: Override 있으면 Reflection 계산 Skip (`anchors.C2`)
- USER Handle 비표시 · Reflection Engine / `detectRail` 수식 비변경
- Display Layer 중심 · Builder 최소 변경

### ■ Corner 처리

- Manual Override 경로에서 Display Cap **sameRail 절단 생략** (`skipSameRail`)
- `detectRail` 수정 없음 · Reflection Engine 수정 없음 · Builder는 Cap 옵션 전달만

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-16** | Reading ON Width = kind별 originalAspect |
| **D-DBP-17** | Reading 토글 시 Overlay Center 유지 · Drag 로직 비변경 |
| **D-DBP-18** | C2 Override rail+t · Cap `skipSameRail` · USER Handle 비표시 |

## 최종 상태

| 항목 | 상태 |
|------|------|
| Reading Mode | **완료** |
| C2 Reflection Handle | **완료** |
| Corner Override (`skipSameRail`) | **완료** |
| Build | **PASS** |
| Unit | **PASS** |
| Lint | **PASS** |

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.3 → **v1.4** (§15 Implemented · §16 C2 Handle) |
| `PROJECT_MASTER_INDEX.md` | v1.55 → **v1.56** |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.6** |

## Explicit Non-Claims

- Continuation / Boundary / CASE A / Corrected Cap Minimum 코드 — 미착수
- Extension Runtime redesign — 비대상
- 본 문서 업데이트 세션의 코드·Git Commit/Push — 없음

## Next

Continuation · CASE A attach · Corrected Cap Minimum · Display Boundary · 또는 Handle Drag 잔여 간섭.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.3 — Reading Mode UX)

## 제목

**D-DBP-13 / D-DBP-14 / D-DBP-15** — Overlay Reading Mode UX 정책 SSOT 추가 (문서 only)

## Summary

Overlay Reading Mode를 구현하기 전에, Display Boundary Policy와 동일 수준의 Presentation UX SSOT를 `DISPLAY_BOUNDARY_POLICY_SSOT.md` §15로 확정하였다. Cap/Boundary/Extension Runtime과 **독립**이며, USER Overlay Shell만 대상이다. **코드·CSS·Component·Icon 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| 적용 | USER Overlay (AI · 계산 · 타점) · Shell only |
| 비적용 | ADMIN · Content Panel · Runtime/Builder/Dataset/Search/Extension |
| ON | Max Height = Table Inner Height · Aspect 유지 · Width 자동 · Typography ×1.45 · Backdrop↑ · 내부 scroll |
| 토글 | 우측 상단 돋보기(+)/(-) |
| Animation | 150–180ms ease-out |
| Reset | Overlay 종료 시 OFF · localStorage 없음 |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-13** | Reading Mode = Presentation UX · Display Boundary와 독립 |
| **D-DBP-14** | USER Overlay Shell만 · Content Panel 수정 금지 |
| **D-DBP-15** | Overlay 종료 시 Reading 상태 초기화 · no localStorage |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.2 → **v1.3** (§15 Reading Mode) |
| `PROJECT_MASTER_INDEX.md` | v1.54 → **v1.55** |

## Explicit Non-Claims

- Reading Mode 코드/아이콘/CSS 미구현
- OVERLAY_LAYOUT_SSOT 본문 교차 개정은 구현 Phase에서
- Cap / Continuation / Boundary / Extension 미변경

## Next

Reading Mode 구현 (Shell · tokens · App state) 또는 Continuation / Corrected Cap Minimum / Boundary.

---

# 2026-08-04 (Display Boundary Phase 2A — Overlay Attach Gate)

## 제목

**D-DBP-12** — Branch별 Trajectory Extension Overlay Attach/Visibility Gate (CASE B)

## Summary

USER 기준값에서 baseline은 C4까지 정상이나, `TrajectoryExtensionLayer`가 draft 존재만으로 corrected Reveal/E1/E2를 항상 그리던 문제를 Presentation Gate로 해결하였다. Runtime draft/hydrate는 유지한다. **“baseline이면 무조건 숨김”이 아니라** `baselineContinuationAllowed`로 CASE A 확장점을 남긴다.

## 구현

| 항목 | 내용 |
|------|------|
| Helper | `renderer/trajectory/trajectoryExtensionOverlayVisibility.ts` |
| App | mount: `extensionOverlayVisibility.attach` |
| USER baseline (Phase 2A) | `baselineContinuationAllowed: false` → attach=false |
| USER corrected / ADMIN | draft 있으면 attach=true |

## 검증

- unit: overlay visibility 5 cases
- Cap tests 회귀
- Build / Lint

## Explicit Non-Claims

- Continuation Rule 미구현 (CASE A attach는 이후)
- Corrected Cap Minimum 코드 미구현
- Extension Runtime / Builder / Hydrate / Search 미변경
- Commit / Push 없음

## Next

Continuation Rule → CASE A `baselineContinuationAllowed` · Corrected Cap Minimum · Display Boundary.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.1 — Corrected Minimum)

## 제목

**D-DBP-10 / D-DBP-11** — Corrected Display Minimum Guarantee 문서 추가 (Phase 1.5 · 문서 only)

## Summary

Architecture Review 결과, corrected Display Cap이 `second_ball` 미교차 시 기본 **C3**에서 끝나는 현행이 5&Half 제품 의도(계산 결과 C4까지 표시)와 불일치함을 확인하였다. `DISPLAY_BOUNDARY_POLICY_SSOT.md`를 **v1.1**로 보강하여 Corrected Display Minimum Guarantee를 규범화하였다. **코드 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| Corrected Minimum | 세컨드볼과 무관하게 **C4까지 항상 표시** · second_ball로 C3 종료 **금지** |
| C5/C6 | Continuation Rule만 결정 |
| Baseline ↔ Corrected | **최소 C4 정책 공유** · 차이는 path(계산 결과) |
| Cap Priority | Invalid → Chain → **Minimum Guarantee** → Continuation → Physical Limit → Second Ball |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-10** | Corrected는 계산 결과가 존재하는 마지막 계산 쿠션(C4)까지 항상 표시 |
| **D-DBP-11** | Continuation은 C4 이후만 · C4 Minimum과 독립 |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.0 → **v1.1** |
| `PROJECT_MASTER_INDEX.md` | v1.53 · Display Boundary 절·참고 갱신 |

## Explicit Non-Claims

- Corrected Cap 코드 미구현 (다음: `trajectoryPathDisplayPolicy.ts`)
- Builder / Extension / Hydrate / Search / Runtime 미변경
- Commit / Push 없음

## Next

Corrected Display Cap C4 Minimum 구현 → Continuation Rule → Display Boundary → Overlay Attach.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.0)

## 제목

**D-DBP-01…09** — USER 기준값/보정값 Display Boundary Policy SSOT 신규 작성 (문서 only)

## Summary

Trajectory Extension은 Task Closed / Runtime Freeze를 유지한 채, USER **기준값 vs 보정값**의 Display Layer 상위 정책이 없음을 확인하고 `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.0을 신규 작성하였다. Extension Runtime을 Difference로 취급하지 않으며, Builder → Cap → Boundary → Overlay Attach → Render 역할을 분리한다. **코드·Runtime·Builder·Hydrate·Dataset·Search 변경 없음.**

## 배경

- Extension Overlay / Cap / baseline·corrected path는 각각 존재하나, “사용자에게 무엇을 어디까지 보여줄까”는 SSOT 부재
- 증상 분석에서 Extension Layer 숨김만으로는 CASE A(동일 계산 → 동일 표시)와 C4 Minimum이 설명되지 않음
- 근본은 Display Boundary 정책 부재 · baseline의 corrected ceiling 종속 등 **Display Cap/Boundary** 이슈

## 산출물

| 문서 | 내용 |
|------|------|
| `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` | Policy SSOT v1.0 |
| `PROJECT_MASTER_INDEX.md` | v1.52 · 문서 계층·참고·Display 절·차기 우선순위에 등록 |

## 핵심 정책 (요약)

- Extension ≠ Difference · Runtime Geometry는 Boundary 입력 아님
- Cap = 단일 path 절단 · Boundary = 두 path 비교/조립 · Overlay Attach = Boundary 이후
- baseline **C4 Minimum** · corrected second_ball / corrected ceiling **비종속**
- **Continuation Rule** (Cap 하위 · axis long/short) · false → C4 종료 · 실패 segment 미표시
- 구현 전 Architecture Review · 수정 허용 = Cap / Boundary / Overlay Attach only

## Explicit Non-Claims

- 코드 구현 없음
- `TRAJECTORY_EXTENSION_SSOT.md` 미수정
- Builder / Hydrate / Dataset / Search / Extension Runtime / `activateStrategySlot` 미변경
- Commit / Push 없음 (문서 세션 · 사용자 지시 시)

## Next

Architecture Review → Display Cap(C4 Minimum · Continuation · ceiling 해소) → Display Boundary → Overlay Attach 순 구현 검토.

---

# 2026-08-03 ~ 2026-08-04 (Trajectory Extension 완료 · USER Search Runtime Activation)

## 제목

**D-EXT-26** — Trajectory Extension Product Complete · USER Search ↔ Strategy Pick Runtime 경로 통합 (`activateStrategySlot`)

## Summary

Trajectory Extension(궤적 연장) Overlay를 Architecture Freeze(v1.3)부터 구현·통합하고, USER Search에서 Extension이 표시되지 않던 문제를 Runtime Slot Activation 누락으로 확정·해결하였다. Search 전용 Hydrate는 만들지 않았고, 공략 버튼(`pickStrategySlot`)과 동일한 `activateStrategySlot()` 경로만 공유한다. **Trajectory Extension Task Closed.**

---

## 1. 문제

USER Search(및 초기 분석 시점의 ADMIN Published Search)에서 Working/Published에 `trajectoryExtensions`가 저장되어 있어도 Extension Layer가 보이지 않았다.

- ADMIN Local DB Recall → Extension 표시 **정상**
- SAVE → Working Dataset → Export → `positions.json`에 `strategies.S*.trajectoryExtensions` **존재**
- `buildDraftsFromRecord` / `draftRuntimeFieldsFromStrategyEntry`는 payload를 draft에 **정상 복사**

---

## 2. 원인 분석

조사 순서: Published Leaf → SAVE → Hydrate whitelist → Render → **USER Runtime gate**.

| 기각 / 부차 | 내용 |
|-------------|------|
| Export Builder strip | Export는 StrategyEntry pass-through · 필드 유지 |
| `buildDraftsFromRecord` 누락 | whitelist에 `trajectoryExtensions` 포함 |
| 다른 Position 오선택 | 희소 데이터·`userStrict`에서 주원인 아님 (부차: cache stale 가능) |

**최종 원인:** USER Search 성공 후 `userTableDisplaySlotId`를 설정하지 않음.

```text
applyUserSearchRecall  →  slot.draft.trajectoryExtensions = O
        ↓
userTableDisplaySlotId 미설정 (null)
        ↓
App Extension hydrate effect
  if (!userTableDisplaySlotId) {
    setTrajectoryExtensionDraft(null);
    return;
  }
        ↓
extensionDraftCount === 0 → TrajectoryExtensionLayer 미마운트
```

기존 SSOT는 “공략 클릭 시 table hydrate”였고, Search는 draft/labels만 만들었다. Extension Layer는 `userTableDisplaySlotId` 게이트에 묶여 있어 Search 직후 Runtime이 열리지 않았다.

---

## 3. 해결

### `activateStrategySlot(slotId)` (App.jsx)

공용 Runtime Slot Activation (Overlay/UI 제외):

```text
actions.switchSlot(slotId)
  → setUserTableDisplaySlotId(slotId)
  → hydrateSlotRuntime(slotId)
```

- `pickStrategySlot` → Overlay clear 후 **`activateStrategySlot` 호출**
- USER Search 성공 → `resolveUserSearchDisplaySlotId` (activeSlot ∈ record.strategies ? 유지 : S1→S2→S3 첫 슬롯) → **`activateStrategySlot`만 호출**
- Search 전용 Hydrate / Extension / Trajectory 경로 **없음**
- `applyUserSearchRecall`은 `flushSync`로 커밋 후 Activation (stale slots 방지 · `shotEditorRef`)

### SSOT

`TRAJECTORY_EXTENSION_SSOT.md` → **v1.4** (Runtime Flow · Search/Pick 공유 · Search-only Hydrate 부재 명시).

---

## 4. 결과

| 검증 | 결과 |
|------|------|
| ADMIN Local DB Recall | 정상 |
| ADMIN Published Search | 정상 |
| USER Search | 정상 (Extension/Trajectory/Target/Layer) |
| SAVE → Refresh → Recall | 정상 |
| Strategy Slot 전환 / Pick | 정상 (`activateStrategySlot` 공유) |
| ADMIN ↔ USER 전환 세션 리셋 | 정상 |
| Extension Handle | 정상 (Handle First Drag 잔여 간섭은 후속 후보) |

**Trajectory Extension 기능 완료 (Task Closed).**

---

## Decision Log (본 항목)

| ID | Decision |
|----|----------|
| **D-EXT-26** | USER Search와 Strategy Pick은 `activateStrategySlot()` 단일 Runtime Activation 경로를 공유한다. Search 전용 Hydrate를 만들지 않는다. |

---

## 변경 파일 (구현 세션 · 문서 세션 제외)

| 파일 | 내용 |
|------|------|
| `frontend/src/App.jsx` | `activateStrategySlot` · `resolveUserSearchDisplaySlotId` · Search/`pickStrategySlot` 통합 · `shotEditorRef` |
| `frontend/src/application/flows/userSearchFlow.ts` | 성공 시 matched `PositionRecord` 반환 |
| (선행) Extension Domain / SAVE / Hydrate whitelist / Layer | S1–S3 · Role · Projection 등 |

---

## Explicit Non-Claims

- Trajectory Builder · Formula · Display Cap · Runtime Contract · Dataset Formula **미수정**
- Search 전용 Hydrate 엔진 **미도입**
- Handle First Drag 잔여 간섭 **미해결** (후속)
- Commit / Push (문서 세션) **없음**

---

## Current Status

```text
Trajectory Extension     : Completed / Task Closed (SSOT v1.4)
USER Search Runtime      : activateStrategySlot 통합
ADMIN / USER paths       : Runtime Activation 공유
Build / Lint             : PASS (구현 세션 기준)
Next (Product)           : Handle Drag 잔여 또는 차기 기능
```

## Next

Handle First Drag 잔여 간섭 정리, 또는 신규 Product 세션. 상세는 `CURSOR_SESSION_HANDOFF.md`.

---

# 2026-08-01 (SYS Apply 백지화 해결 · Runtime Contract SSOT 완성 · ModalShell Native Selection 제거)

## 제목

**D-RTC-01 / D-OVLSEL-01** — `buildSlotDraftWithUpdatedSys()` legacy `profile` dangling reference 제거 · ModalShell open 시 browser native Selection 초기화

## Summary

관리자 SYS 설정에서 **적용(Apply)** 을 누르면 화면 전체가 백지화되던 오류와, 새로고침 후 **첫 SYS Overlay**를 열 때 패널 텍스트가 파랗게 선택 표시되던 오류를 각각 해결하였다.

백지화의 원인은 `useShotSlots.ts`의 `buildSlotDraftWithUpdatedSys()`가 Batch 6 Runtime Contract 이관 후에도 남아 있던 **선언되지 않은 `profile` 변수**를 debug 필드에서 참조하던 것이다. `commitDraftSys` 경로의 React render phase에서 `ReferenceError`가 발생했고, ErrorBoundary가 없어 React root 전체가 unmount되었다. 같은 함수가 이미 Runtime Contract에서 해석해 둔 `formulaExpr`을 재사용하도록 바꿔, 해당 함수의 마지막 legacy 직접 참조를 제거하고 **Runtime Contract SSOT를 완성**하였다.

파란 selection highlight는 Interaction 문제가 아니라 **브라우저 native text selection의 잔존**이었다. Target Ball 더블클릭이 만든 Selection Range가 살아 있는 상태에서 ModalShell panel DOM이 삽입되면, 새 텍스트가 그 Range에 편입되어 highlight로 렌더된다. ModalShell이 열릴 때 1회 `window.getSelection()?.removeAllRanges()`를 호출해 native Selection만 초기화하는 방식으로 해결하였다. Pointer Capture / `preventDefault` / dblclick 로직 / `user-select` CSS는 일절 변경하지 않았다.

---

## 1. SYS Apply 백지화 (D-RTC-01)

### 문제

- ADMIN에서 기존 포지션을 불러와 SYS 값을 수정하고 **적용**을 누르면 화면 전체가 백지화
- Console: `Uncaught ReferenceError: profile is not defined at buildDraftWithUpdatedSys (useShotSlots.ts:315:17)`
- 사용자 체감상 "신규 포지션은 정상, 기존 포지션만 실패"로 보였음

### Root Cause

`frontend/src/hooks/useShotSlots.ts` `buildSlotDraftWithUpdatedSys()` 내부 debug 필드가 **선언되지 않은 `profile` 변수**를 참조하고 있었다.

```text
Batch 6 Runtime Contract 이관
    ↓
system JSON 직접 접근(profile) → getSystemContract() 경유로 전환
    ↓
같은 함수 상단은 formulaExpr 로 정상 이관됨 (line 255)
    ↓
debug.expr 한 줄만 legacy profile 참조로 잔존 (line 315)
    ↓
commitDraftSys → setState updater(render phase)에서 ReferenceError
    ↓
ErrorBoundary 부재 → React root unmount → 백지 화면
```

**신규 / 기존 포지션 차이에 대한 정정**

오류는 포지션 종류와 무관하게 `commitDraftSys`가 호출될 때마다 발생한다. 새로고침 직후에는 SYS Overlay 컨트롤을 활성화하기 위해 Target Ball 더블클릭이 선행되어야 하고, 그 경로를 거친 뒤에야 Apply에 도달하기 때문에 "기존 포지션에서만 발생"하는 것처럼 관측된 것이다.

### 해결 내용

이미 같은 함수에서 Runtime Contract로 해석해 둔 `formulaExpr`을 재사용한다.

```text
line 255 : const formulaExpr = getSystemContract(nextSystemId)?.profile?.formulaExpr ?? null;
line 315 : expr: profile?.formula?.expr ?? null   →   expr: formulaExpr
```

- 변경 1줄 · 계산 결과에 영향 없음 (debug 표시 필드)
- System JSON 직접 접근 경로가 사라져 해당 함수의 Runtime Contract 경유가 완성됨

### 정적 분석이 놓친 이유

| 도구 | 사유 |
|------|------|
| Build (`vite build`) | `tsc --noEmit` 미포함 — 타입 체크 없이 transpile only |
| Lint (`eslint .`) | `eslint.config.js`의 `files: ['**/*.{js,jsx}']` — `.ts` 파일 미검사 |

> **후속 후보(미적용):** build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함. 이번 세션 범위 외.

### Commit

`abeca84` — fix(sys): resolve blank screen on SYS apply by removing legacy profile reference

---

## 2. ModalShell Native Selection (D-OVLSEL-01)

### 문제

- 관리자 새로고침 → Target Ball 더블클릭 → SYS Overlay 오픈
- **첫 오픈에서만** 패널 텍스트 전체가 파란 selection highlight 상태로 표시
- 닫았다 다시 열면 정상

### Root Cause

**Pointer Capture / Interaction 문제가 아니다.** 브라우저 native text selection의 잔존이다.

```text
Target Ball 더블클릭 (native dblclick 보존 정책에 따라 preventDefault 없음)
    ↓
브라우저가 Selection Range 생성 (word/paragraph 단위)
    ↓
Range가 해제되지 않은 채 유지
    ↓
SYS Overlay(ModalShell) panel DOM 삽입
    ↓
새 텍스트 노드가 기존 Range 범위 안에 편입
    ↓
selection highlight 렌더
```

"첫 오픈에서만" 발생하는 이유는, SYS 버튼이 Target Ball 더블클릭 이후에만 활성화되기 때문이다. 즉 Overlay를 열기 직전 동작이 반드시 더블클릭이며, 그 더블클릭이 남긴 Selection이 그대로 Overlay에 걸린다. 두 번째 오픈부터는 직전 상호작용이 더블클릭이 아니므로 재현되지 않는다.

**기여 조건**

- `.modal-panel` / `.modal-panel--sys`에 `user-select` 규칙 없음
- `::selection` 커스텀 규칙 없음 (브라우저 기본 파란색)
- `handlePointerDown`은 native dblclick 보존을 위해 `preventDefault()`를 호출하지 않음 (Pointer Capture Timing SSOT)
- `handleBallDoubleClickForTarget`의 `preventDefault()`는 Selection이 이미 생성된 뒤라 시점상 무효
- ModalShell이 mount 시 Selection / focus를 정리하지 않음

### 해결 내용 (Option A)

ModalShell이 열릴 때 1회 native Selection만 초기화한다.

```text
frontend/src/components/common/ModalShell.jsx

useEffect(() => {
  if (!open) return;
  window.getSelection()?.removeAllRanges();
}, [open]);
```

- ModalShell은 닫혀 있을 때 `null`을 렌더링하되 컴포넌트 자체는 mount 상태로 남으므로, 실제 panel DOM이 삽입되는 `open === true` 전환을 기준으로 한다.
- 기존 drag-state 초기화 effect에 병합하지 않고 전용 effect로 분리하여 의도와 롤백 경계를 명확히 유지한다.
- **파일 표기 정정:** 프로젝트에 `ModalShell.tsx`는 존재하지 않는다. 실제 파일은 `ModalShell.jsx`이다.

### 절대 변경하지 않은 것

Pointer 이벤트 · `preventDefault` 추가 · dblclick 로직 · `user-select` CSS · Ball / Pad / SVG Interaction · Pointer Capture Timing. **Native Selection 초기화 외 리팩터링 없음.**

### Commit

`7ef9601` — fix(overlay): clear stale native selection when ModalShell opens

---

## 검증 결과

localhost dev server(`5175`)에서 브라우저 직접 검증.

### 대조군 (Selection 소멸 원인 귀속)

| 절차 | rangeCount |
|------|-----------|
| Selection 생성 후 **비 Overlay 버튼** 프로그램 클릭 | 1 → **1** (유지) |
| Selection 생성 후 **SYS Overlay 오픈** | 1 → **0** (초기화) |

비 Overlay 클릭에서는 Selection이 유지되므로, Overlay 오픈 시의 소멸은 ModalShell effect에 귀속된다.

### 기능 / Regression

| 항목 | 결과 |
|------|------|
| SYS Overlay 파란 Selection Highlight | **없음** |
| SYS 계산 | 정상 (C0=50 · C1=70 → C3 자동 -20 · 기준 계산 블록 렌더) |
| SYS 적용 (`commitDraftSys`) | 정상 · 백지화 없음 · 궤적 반영 |
| HP/T Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| STR Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| AI Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| Workspace History Modal (동일 ModalShell 소비자) | 정상 · Selection 0 |
| Target Ball DoubleClick | 정상 (SYS 버튼 disabled → enabled 전환 확인) |
| Ball Drag | 정상 (요청 좌표 (875,690) 정확 도달) |
| Pointer Capture 시점 | **pointermove에서 획득** — Pointer Capture Timing SSOT 유지 확인 |
| Pad Drag (Joystick) | 정상 (gain 비율대로 공 추종) |
| Console Error | **0건** (전 과정) |
| Fresh Load | 정상 렌더 · 에러 0 |
| Build | **PASS** (`vite build` 5.68s) |
| Lint | **PASS** — 변경 전/후 동일 (`ModalShell.jsx` 기존 `react-hooks/refs` 1건만, 신규 0) |
| Regression | **없음** |

> **검증 한계 (Explicit):** 브라우저 자동화 도구의 왕복 지연이 dblclick 임계시간보다 길어, 두 번의 물리 클릭으로는 native dblclick이 성립하지 않았다. Target Ball DoubleClick 항목은 `dblclick` 이벤트 직접 dispatch로 검증하였다. 실제 마우스 더블클릭 육안 확인은 별도 권장.

---

## Decision Log

| ID | Decision |
|----|----------|
| **D-RTC-01** | Runtime Contract 이관 대상 함수는 debug / 표시 전용 필드까지 포함하여 System JSON 직접 접근을 남기지 않는다. Contract에서 이미 해석된 값을 재사용한다. |
| **D-OVLSEL-01** | ModalShell은 `open` 전환 시 1회 `window.getSelection()?.removeAllRanges()`로 browser native Selection을 초기화한다. |
| **D-OVLSEL-02** | Overlay는 **browser selection 상태만** 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다. Selection 문제를 `preventDefault` 추가나 `user-select` CSS로 해결하지 않는다. |

---

## 변경 파일 / 함수

| 파일 | 함수 / 위치 | 내용 |
|------|-------------|------|
| `frontend/src/hooks/useShotSlots.ts` | `buildSlotDraftWithUpdatedSys()` line 315 | `profile?.formula?.expr ?? null` → `formulaExpr` |
| `frontend/src/components/common/ModalShell.jsx` | `ModalShell` — `open` 전용 `useEffect` | native Selection 1회 초기화 |

---

## Explicit Non-Claims

- SYS 계산 엔진 · Formula · Registry · Dataset 변경 **없음**
- Pointer Capture Timing (D-INTERACT-01~03) 변경 **없음**
- `preventDefault` 추가 **없음** · `user-select` CSS 추가 **없음**
- Ball / Pad / SVG Interaction 변경 **없음**
- USER Overlay(`UserOverlayShell`) 변경 **없음** — ModalShell은 ADMIN 계열 모달 전용
- ErrorBoundary 도입 **없음** (후속 후보)
- build `tsc --noEmit` / ESLint `.ts` 포함 **미적용** (후속 후보)

---

## Interaction / Overlay SSOT

Overlay native Selection 규칙은 `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` **§Overlay Native Selection (Interaction SSOT)** 에 고정한다.

---

## Current Status

```text
Pointer Capture Timing   : 안정 (D-INTERACT-01~03 유지)
Target Ball DoubleClick  : 안정
Runtime Contract SSOT    : 완료 (legacy profile dangling reference 제거)
SYS Apply 백지화          : 해결
ModalShell Selection      : 해결
Build                    : PASS
Lint                     : PASS
Regression               : 없음
Commit                   : abeca84 · 7ef9601
```

## Next

~~**Trajectory Extension 설계**~~ → **Completed (2026-08-03~04)**. 상단 최신 로그 · `CURSOR_SESSION_HANDOFF.md` 참조.

---
