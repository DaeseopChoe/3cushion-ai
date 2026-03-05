# PROJECT LOG – 2026-03

Version: v1.0  
Created: 2026-03-01  
Scope: App Slim화 + 구조 안정화 세션

---

# 📌 1. 세션 개요

2026-03 세션의 목적은 다음과 같았다:

- 거대한 App.jsx 구조 슬림화
- 도메인/물리/렌더/컨트롤러 레이어 분리
- 구조를 “확장 가능한 상태”로 전환
- 문서와 실제 코드 구조 동기화

이번 세션은 기능 추가가 아닌 **구조 재정렬(Refactor Phase 1)**에 해당한다.

---

# 🧱 2. 주요 작업 내역

## 2.1 Geometry 분리

### 변경
- App.jsx 내부 좌표 변환 로직 분리
- utils/geometry/coords.ts 생성

### 원칙
- SCALE, TABLE_H, PADDING 등 상수는 파일 내부 정의 금지
- 모든 값은 호출부(App)에서 인자로 주입
- 순수 함수 유지

### 목적
App가 계산기를 가지지 않도록 하기 위함.

---

## 2.2 Physics 분리

### 변경
- utils/physics/impact.ts
- utils/physics/systemLine.ts
- utils/physics/index.ts

### 핵심
- calculateImpact는 BALL_DIAMETER_RG / BALL_RADIUS_RG를 인자로 받도록 수정
- 상수 내부 선언 금지
- 기존 App 계산 로직 그대로 이동

### 목적
App에서 물리 계산 책임 제거.

---

## 2.3 Rendering 컴포넌트 분리

components/table/ 생성:

- AnchorPoint.jsx
- SystemValueLabels.jsx
- ImpactLines.jsx
- CoachingOverlay.jsx

### 설계 기준
- 계산은 App/Hook에서
- 컴포넌트는 순수 렌더링만 수행
- Geometry import 최소화

### 결과
SVG 블록이 App에서 제거됨.

---

## 2.4 Controller Hook 도입

추가:

- useCoachingController.ts
- useSystemController.ts
- useDisplayController.ts

### 핵심 원칙

1. Hook은 반드시 early return 이전에 호출
2. Hook 내부는 데이터만 반환 (JSX 없음)
3. 단일 책임 유지

### 해결한 문제

- “Rendered more hooks than during the previous render” 에러 해결
- Hook 호출 순서 안정화

---

## 2.5 tableConfig 단일 출처화

config/tableConfig.ts 생성

### 목적
- SCALE, TABLE_W, TABLE_H, PADDING 중앙 관리
- 하드코딩 제거
- 단일 출처 원칙 확정

---

## 2.6 Domain 전략 엔진 분리

domain/ 생성:

- railEngine.ts
- strategyEngine.ts
- index.ts

### 변경
- groupSystemValuesByRail App에서 제거
- runStrategyEngine 도입

### 파이프라인 확정

Strategy  
→ domain/runStrategyEngine  
→ utils/physics  
→ hooks  
→ components/table  
→ App 조립

---

## 2.7 문서 동기화

갱신된 문서:

- 5_PROJECT_MASTER_STATE_CURRENT.md (v2.0)
- 6_CURRENT_CODE_SNAPSHOT_SUMMARY.md
- 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
- 3_SYSTEM_ARCHITECTURE.md
- 1_PROJECT_MASTER_INDEX.md

구조와 문서 간 모순 제거 완료.

---

# 🧠 3. 설계 의도

이번 세션의 핵심 방향:

1. App는 Orchestrator로 제한
2. 계산은 외부 레이어로 이동
3. Config는 단일 출처
4. Hook 호출 순서는 항상 고정
5. 도메인 로직은 React 의존 금지

목표는:

“확장 가능한 안정 구조” 확보

---

# ⚠ 4. 현재 남은 리스크

1. Pointer/Drag 관련 로직 일부 App 내부 존재
2. Ball 렌더링 일부 App 직접 제어
3. 전략 엔진 테스트 미구현
4. 타입 안정성 일부 약함
5. Interaction Controller 미분리

현재 위험도: 낮음  
구조 붕괴 위험: 낮음  

---

# 🚀 5. 다음 단계 계획 (예정)

1. Interaction Controller 분리
2. Strategy Engine 고도화
3. 저장 구조 설계 (Persistence)
4. AI 전략 생성 로직 고도화
5. 단위 테스트 도입

---

# 📊 6. 세션 평가

Before:
- App.jsx 약 3800줄
- 계산/물리/렌더 혼재

After:
- App.jsx 약 3400줄
- 구조적 분리 완료
- 레이어 경계 명확화

이번 세션은:

Refactor Phase 1 완료

---

Status: Active (2026-03 진행 중)

---

# 2026-03 — Admin Save & Final Coordinate Engine Integrated

- Implemented finalCoordinateEngine for sys→final coordinate mapping
- Added evaluateStrategy domain wrapper
- Connected "전체 적용" button to dataset persistence
- Introduced StrategyMeta (impact, final, angles)
- Dataset now stored in localStorage
- Slot structure stabilized (S1/S2/S3 separated from function buttons)
- Identified need for Position merge strategy
- Next milestone: Admin Auto-Recommended Loading Logic

---

# 2026-03 — Position Merge & KD-Tree & Admin Auto-Recommend

- Position merge engine implemented (positionMergeEngine.ts)
- appendPositionToDataset replaced with upsertPositionRecord
- localStorage dataset storage stabilized
- Circular JSON serialization bug fixed (strategy sanitize)
- SYS overlay apply logic fixed (slot.applied.sys 동기화)
- Admin auto recommendation (slotAutoRecommend) added
- KD-tree index structure introduced (kdTree6d, positionKDIndex, signatureKey)
- SAVE 버튼 → handleSaveStrategy 연결
- 전략 혼합 금지 원칙 확정 (signatureKey별 분리)

---

# 2026-03-05 — StrategyEngine Refactor

- strategyEngine.ts redesigned as recommendation engine
- Added recommendForAdmin()
- Added recommendForUser()
- Added recommendWithInterpolation() placeholder

Code responsibilities separated:

- strategyEngine → strategy recommendation
- railEngine → rail grouping + system value application
- positionSearchEngine → KD-tree search