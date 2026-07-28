# CURSOR_SESSION_HANDOFF.md

```
Document  : CURSOR_SESSION_HANDOFF.md
Type      : Cursor Session Handoff (Operational)
Date      : 2026-07-28
Scope     : USER Overlay UX Phase · Projection Rule · CALC Viewer · Shell 통합
Rule      : Fact only · Overlay Layout SSOT v1.2 = absolute baseline ·
             viewport 기반 width/vh 규칙 재도입 금지 · AI Overlay = 기준 디자인 유지 ·
             USER = ADMIN DisplayModel Viewer (Projection Rule)
```

---

## 0. 새 세션 — 필수 읽기 순서 (USER Overlay UX Phase)

```text
1. PROJECT_MASTER_INDEX.md
2. HISTORY/PROJECT_LOG_2026-07.md   ← D-USEROVL-02 (최신)
3. OVERLAY_LAYOUT_SSOT_v1.2.md
4. 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
5. CURSOR_SESSION_HANDOFF.md
6. frontend/src/components/common/UserOverlayShell.jsx
7. frontend/src/overlay/layout/overlayLayoutTokens.ts
8. frontend/src/overlay/utils/sysCalcDisplayModel.ts
9. frontend/src/components/user/UserCalculationPanel.jsx
10. frontend/src/components/user/UserCalcToolbar.jsx
11. frontend/src/index.css
```

| # | Document | Purpose |
|---|----------|---------|
| **1** | **MASTER** | 현재 USER Overlay / Projection Rule SSOT |
| **2** | **LOG** | D-USEROVL-01…02 이력 |
| **3** | **Overlay SSOT v1.2** | Layout 절대 기준 |
| **4** | **Frontend Baseline** | Projection / Viewer architecture |
| **5** | **HANDOFF** | carry / next / 보류 |
| 6–11 | Shell · Token · DisplayModel · Viewer · Toolbar · CSS | 구현 inspection |

---

## 1. Current Status

| Item | Value |
|------|-------|
| **Current Phase** | **USER Overlay UX Phase** |
| **Official Baseline** | **Overlay Layout SSOT v1.2** |
| **USER Projection Rule** | **Official** |
| **Common Shell** | **Implemented** · Close(X) 없음 |
| **AI Overlay** | **Completed** · 기준 UX / Shell (`widthRatio 0.42`) |
| **HPT Overlay** | **AI Shell 규격 적용** · 공 크기 독립 = **Polish 보류** |
| **Calculation Overlay** | **Completed** · Shell + Toolbar + DisplayModel Viewer (`widthRatio 0.62`) |
| **좌측 메뉴** | **계산** (구 `동선`) |
| **Final integration** | **Pending** |

```text
Overlay SSOT v1.2     : Confirmed (+ 2026-07-28 incremental)
Common Shell          : Implemented (No Close X)
AI Overlay            : Completed (baseline UX)
HPT Overlay           : AI Shell mapping done · Polish deferred
Calculation Overlay   : Common Shell + Toolbar + DisplayModel Viewer
USER Projection Rule  : Official (CALC applied)
Final integration     : Pending
Commit / Push         : Not done this session
```

---

## 2. Completed

- AI Overlay 기준 UX 완료
- Close(X) 제거 (Common Shell)
- HPT Common Shell 이전 → AI Shell 규격 (`0.42` / `0.85` / medium / fitContent false)
- Calculation Common Shell 이전
- Calculation Toolbar 완료 (기준값 · 보정값 · 계산 보기/감추기 · 쿠션 포인트)
- Calculation DisplayModel Viewer 전환 (`buildSysCalcDisplayModel`)
- USER Projection Rule 코드 반영
- Calculation 백지 오류 수정 (`resolveCoC1C3Keys` 입력 계약)
- CALC 우측 미사용 Close gutter 제거
- CALC 폭 `0.42` → `0.62` 적용
- AI Typography 적용 (CALC)
- 쿠션 포인트 토글 복원 및 명칭 확정

---

## 3. 주요 오류 및 해결

### 백지 화면

**원인:** `resolveCoC1C3Keys(forced, spaceSel)` 호출 시 USER 경로에서 인자를 하나만 전달 → 두 번째 인자 `spaceSel`이 `undefined` → `spaceSel.CO` TypeError.

**수정 (App.jsx — ADMIN 입력 계약과 동일):**

```text
forced  = parseSysFormulaExpr(formulaExpr)
spaceSel = slotRenderSys?.spaceSel ?? { CO:"f", C1:"f", C2:"f", C3:"f", C4:"f" }
resolveCoC1C3Keys(forced, spaceSel)
```

**주의:**

- optional chaining으로 숨기지 않음
- ADMIN과 동일한 입력 계약을 USER 경로에 공급
- USER Projection Rule 유지 (DisplayModel Viewer 구조 유지)

---

## 4. In Progress / Carry

- USER Overlay 통합 검증 (AI ↔ HPT ↔ CALC)
- Calculation 기준값/보정값 ↔ ADMIN 표현 일치 최종 확인
- Mobile / Tablet / Desktop 시각 검증

### 반드시 기억할 보류 항목

> **HPT Overlay SVG intrinsic bounds / viewBox crop 및 공 크기 독립 유지**

현재 HPT는 AI Shell로 이전되었으나, Content(viz)가 `--uos-w`에 커플링되어 Shell 스케일 축소에 따라 공 크기도 함께 줄어든 상태를 **임시 수용**한다. Polish에서 Shell과 Content 크기를 분리한다.

---

## 5. Next Work Order

1. USER Overlay 통합 검증  
2. Calculation 기준값/보정값 ADMIN 표현 일치 최종 확인  
3. Mobile / Tablet / Desktop 시각 검증  
4. HPT UX Polish 재검토  
   - 공 크기 유지  
   - SVG intrinsic bounds / viewBox  
   - Shell과 Content 크기 독립  
5. 최종 문서 동기화  
6. Commit / Push  

---

## 6. Architecture / Ownership

### USER Projection Rule

```text
ADMIN Input / Calculation
  → Domain DisplayModel (buildSysCalcDisplayModel)
  → USER 공개 Block 선택 (baseline | corrected)
  → Read-only Viewer (UserCalculationPanel)
  → UserOverlayShell
```

### Shell owns

- surface · ratio · typography scale · padding · drag · clamp · center
- Close(X) **없음** · outside tap close

### Content owns

- text · image · svg · DisplayModel projection (read-only)
- Width SSOT 소유 금지 · Shell max token을 preferred width로 재사용 금지

### Toolbar (CALC)

- Shell **밖** Controller UI · Drag 제외 · Overlay hide 시에도 유지 가능

### Non-negotiable

- Content는 Layout Size를 직접 결정하지 않는다.
- USER는 문구/식/숫자 배열을 재생성하지 않는다.

---

## 7. 수정 금지 / 주의사항

- AI Overlay를 USER Overlay의 기준 디자인으로 유지
- Overlay Layout SSOT v1.2를 절대 기준으로 사용
- viewport 기반 width / `vh` 규칙 재도입 금지
- USER Overlay별 서로 다른 drag 규칙 도입 금지
- Shell / Content ownership 혼합 금지
- CALC Projection을 `UserTrajectoryCardModel`로 되돌리지 않음
- SYS 계산 엔진 / DisplayModel 생성 로직 임의 변경 금지

공통 유지:

- 동일한 Shell 규칙 (AI/HPT = `0.42`, CALC만 `0.62` 예외)
- 동일한 Drag / Typography language / Ratio container (`.table-area`)

---

## 8. Current Session Card

```text
Session ID     : D-USEROVL-02
Baseline       : Overlay Layout SSOT v1.2 + Projection Rule
Current Done   : CALC Viewer · Toolbar · width 0.62 · HPT→AI Shell · blank fix
Current Carry  : Integration verify · HPT Polish (ball size independence)
Next Session   : USER Overlay 통합 검증 → HPT Polish → Commit/Push
```

---

*End of CURSOR_SESSION_HANDOFF.md — 2026-07-28 · D-USEROVL-02*
