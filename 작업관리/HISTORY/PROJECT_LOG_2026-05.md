# PROJECT LOG – 2026-05

Version: v1.0  
Created: 2026-05-03  
Scope: Trajectory · 테이블 UX · SYS 설정 UI  

이전 월 로그: `PROJECT_LOG_2026-04.md`

---

## 1. 세션 개요

2026-05 세션은 **곡선 궤적 안정화**, **코칭/조작 UX**, **관리자 SYS 폼 표시**를 중심으로 진행했다.

주제별로 보면:

- **Trajectory**: 베이스라인·쿠션 경로 렌더 분리, 단조 곡선·effect-line 구속 후 Curve A/B 단순화 및 prebend 튜닝
- **UX**: 큐→임팩트 흰색 점선 가이드 복구, 볼 드래그 정밀 모드(Ctrl/Shift)
- **SYS UI**: 물리 보정 라벨·표시 순서 정리

---

## 2. Git 커밋 요약 (월별)

| 날짜 | 커밋 | 요약 |
|------|------|------|
| 2026-05-01 | `00b627c` | Base Line 렌더 복구, cushionPath 렌더 분리, 의도치 않은 polyline 제거, 곡선 디버깅 준비 |
| 2026-05-03 | `a234fb9` | 단조(monotonic) 곡선 궤적 및 effect-line confinement 안정화 |

*(로컬에서 커밋되지 않은 후속 수정은 아래 세션별 항목에만 적었음.)*

---

## 3. 궤적·렌더링 (Trajectory / ImpactLines)

### 3.1 Base Line · Cushion 경로 (`00b627c`)

- CO→C1→… 베이스라인 표시 경로 정리 및 클리핑·누락 세그먼트 수정 방향의 작업을 포함한다.
- 표시용 cushion path와 다른 오버레이를 분리해 디버그·머지 과정에서 생기던 중복 polyline을 줄였다.

### 3.2 단조 곡선 · Effect-line (`a234fb9`)

- 곡선이 의도치 않게 되돌아가거나 effective line 밖으로 새는 문제를 줄이기 위한 안정화 작업이다.
- `ImpactLines` 등에서 빨간 궤적은 **직선만 있는 경우** 등 조건에서 polyline을 그리지 않는 등의 기준이 함께 다듬어졌다.

### 3.3 Curve A / Curve B 반복 튜닝 (세션 내)

**목표**: Curve A와 Curve B 연결부(merge 근처) 꺾임·부자연스러운 S형 완화.

**시도했던 방향**

- Curve B 시작 접선을 Curve A 종료 접선과 맞추고, chord 분할·이중 quadratic·reflection으로 내부 C1를 맞추는 구성.

**최종 방향 (단순화)**

- 사용자 피드백에 따라 **Curve B는 단일 quadratic**, **`tangentB = dirTB`(peak→merge 단위 방향)** 로 되돌림.
- **`applyEffectLineBlendToControl`** 은 유지.
- Curve A만 **`CURVE_A_PREBEND_RATIO`** 를 `0.12` → **`0.15`** 로 소폭 상향하여 merge 전 방향을 자연스럽게 맞추는 쪽으로 조정.

**코어 파일**: `frontend/src/utils/trajectory/curveTrajectory.ts`

### 3.4 주황색 보조선(CO_sys→C1 머지 가이드) 굵기

- 렌더 위치: `frontend/src/components/table/ImpactLines.jsx` 의 주황 `#fb923c` `<line>` (CO_line ↔ C1_line).
- 보정 가이드용으로 **`strokeWidth`를 약하게**(예: `2` → `1`) 조정하여 궤적과 시각적 위계를 맞추는 변경이 포함되었다.

---

## 4. 테이블·코칭 UX (`App.jsx` 등)

### 4.1 에임 가이드(흰색 점선) 복구

- 디버그 정리 과정에서 꺼져 있던 **큐볼 중심 → 임팩트(컨택) 유령 공** 방향의 흰색 점선을 복구했다.
- 구현: `CoachingOverlay`의 `guideLine`에 `coaching.guideLineNode` 기반 `<line>` 전달 (`strokeDasharray`, `pointerEvents="none"` 등).
- 궤적(`curveTrajectory`) 계산 로직과는 분리된 보조선이다.

### 4.2 볼 드래그 정밀 이동

- Position 모드에서 포인터 이동량을 **delta 기반**으로 유지하면서:
  - **Ctrl**: 이동 스케일 약 **0.2**
  - **Shift**: 약 **1.5**
- 테이블 SVG 드래그와 조이패드 드래그 모두 동일 스케일을 적용할 수 있도록 맞춤.
- 클램프·임팩트 FREE 모드 스냅 등 기존 규칙은 유지.

---

## 5. SYS 설정 UI

### 5.1 물리 보정 필드 (`App.jsx`)

- 라벨 **「곡구」→「기울기」** (`curve_ratio` 키 유지).
- 표시 순서: **밀림 → 끌림 → 기울기 → 스핀 → 출발값 보정**.
- 상태 키 이름·계산 로직은 변경하지 않고 UI 순서·문구만 조정.

### 5.2 Sys 오버레이 (`SysOverlay.tsx`)

- 동일 계열 라벨을 **Slide (밀림) → Draw (끌림) → Curve (기울기) → Departure (출발값 보정)** 순으로 맞춤.
- 이 패널에는 스핀 입력 행이 없어 웹 메인 폼과 필드 개수는 다를 수 있다.

---

## 6. 참고·보류

- **디버그 ingest 로그**: 개발 중 `curveTrajectory.ts`, `ImpactLines.jsx` 등에 세션별 디버그 POST가 남아 있을 수 있다. 배포 전 정리 여부는 별도 판단.
- **문서**: `frontend/docs/` 아래 분석·핸드오프 초안 파일들은 워킹 트리에 따라 존재할 수 있으며, 본 로그에는 파일 단위로 고정하지 않았다.

---

## 7. 다음 월에 이어서 볼 만한 것

- Curve A/B 시각 결과가 안정적인지 **여러 트랙·두께**에서 스크린 검증.
- 디버그 로깅 제거 또는 플래그화 일원화.
- `PROJECT_LOG_2026-06.md` 분리 시 본 파일은 수정하지 않고 링크만 추가하는 방식 유지 권장.

---

*End of PROJECT LOG – 2026-05*
