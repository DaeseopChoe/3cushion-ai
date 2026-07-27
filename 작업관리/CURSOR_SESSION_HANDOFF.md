# CURSOR_SESSION_HANDOFF.md

```
Document  : CURSOR_SESSION_HANDOFF.md
Type      : Cursor Session Handoff (Operational)
Date      : 2026-07-27
Scope     : USER Overlay UX Phase · Overlay Layout SSOT v1.2 Confirmed
Rule      : Fact only · Overlay Layout SSOT v1.2 = absolute baseline ·
             viewport 기반 width/vh 규칙 재도입 금지 · AI Overlay = 기준 디자인 유지
```

---

## 0. 새 세션 — 필수 읽기 순서 (USER Overlay UX Phase)

```text
1. PROJECT_MASTER_INDEX.md
2. HISTORY/PROJECT_LOG_2026-07.md
3. OVERLAY_LAYOUT_SSOT_v1.2.md
4. 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
5. CURSOR_SESSION_HANDOFF.md
6. frontend/src/components/common/UserOverlayShell.jsx
7. frontend/src/overlay/layout/overlayLayoutTokens.ts
8. frontend/src/index.css
```

| # | Document | Purpose |
|---|----------|---------|
| **1** | **MASTER** | 현재 USER Overlay 진행률 / 공식 기준 |
| **2** | **LOG** | USER Overlay SSOT 작업 이력 |
| **3** | **Overlay SSOT v1.2** | 절대 기준 문서 |
| **4** | **Frontend Baseline** | Layer ownership / architecture pointer |
| **5** | **HANDOFF** | 현재 carry / next steps |
| 6–8 | Shell / Token / CSS | 실제 구현 inspection 출발점 |

---

## 1. Current Status

| Item | Value |
|------|-------|
| **Current Phase** | **USER Overlay UX Phase** |
| **Official Baseline** | **Overlay Layout SSOT v1.2** |
| **Common Shell** | **Implemented** |
| **table-area Ratio Layout** | **Applied** |
| **Glass Dark Surface** | **Applied** |
| **Full Surface Drag** | **Applied** |
| **Grab Bar** | **Removed** |
| **Center Rule** | **Applied** |
| **Clamp Rule** | **Applied** |
| **Offset Persistence** | **Forbidden / Not stored** |
| **AI Overlay** | **Completed** |
| **타점 Overlay** | **Common Shell 적용 완료 · Content Fit carry** |
| **계산 Overlay** | **Not started** |

```text
Overlay SSOT v1.0 : Drafted
Overlay SSOT v1.1 : Confirmed
Overlay SSOT v1.2 : Confirmed
Common Shell       : Implemented
AI Overlay         : Completed
타점 Overlay       : Shell migrated / content-fit carry
계산 Overlay       : Planned
Final integration  : Pending
```

---

## 2. Completed

- Overlay Layout SSOT v1.2 확정
- Common Overlay Shell 구현
- table-area Ratio 기반 Layout 적용
- Glass Dark Surface 적용
- Full Surface Drag 적용
- Grab Bar 제거
- Center Rule 적용
- Clamp Rule 적용
- Offset 저장 금지 확정
- AI Overlay 완료
- 타점 Overlay 공통 Shell 적용

---

## 3. In Progress

- 타점 Overlay Content Fit 최적화

### Confirmed issue

타점 Overlay는 Shell 폭이 Content보다 크게 유지되고 있다.

- 기존 수정은 padding 조정 중심이었다.
- 실제 화면 변화는 거의 없었다.
- 다음 세션에서는 CSS 수치 조정부터 시작하지 않는다.

---

## 4. Next Session Analysis Order

반드시 아래 순서로 먼저 분석한다.

```text
1. Layout Inspection
2. Shell Width 결정 구조
3. Content Width 결정 구조
4. Glass Width 결정 구조
5. Content Fit 수정
```

즉, 다음 세션에서는 **원인 구조 분석 후 수정**이 우선이다.

---

## 5. Next Work Order

1. 타점 Overlay Layout Inspection  
2. Content Fit 수정  
3. 계산 Overlay(Common Shell 적용)  
4. 계산 Overlay UX 개선  
5. USER Overlay 최종 통합  

---

## 6. Architecture / Ownership

### Shell owns

- surface
- ratio
- typography
- padding
- drag
- clamp
- close
- position

### Content owns

- text
- image
- svg
- calculation
- lesson

### Non-negotiable rule

Content는 Layout Size를 직접 결정하지 않는다.

---

## 7. 수정 금지 / 주의사항

- AI Overlay를 USER Overlay의 기준 디자인으로 유지
- Overlay Layout SSOT v1.2를 절대 기준으로 사용
- viewport 기반 width / `vh` 규칙 재도입 금지
- USER Overlay별 서로 다른 drag 규칙 도입 금지
- Shell / Content ownership 혼합 금지

모든 USER Overlay는 다음을 유지한다.

- 동일한 Shell
- 동일한 Drag
- 동일한 Typography
- 동일한 Ratio
- 동일한 Responsive Rule

---

## 8. Current Session Card

```text
Session ID     : USER Overlay UX Phase
Baseline       : Overlay Layout SSOT v1.2
Current Done   : Shell + AI + 타점 Shell migration
Current Carry  : 타점 Overlay content-fit issue
Next Session   : Inspection first, then content-fit fix
After That     : 계산 Overlay Common Shell apply
```

---

*End of CURSOR_SESSION_HANDOFF.md — USER Overlay UX Phase · SSOT v1.2 Baseline*
