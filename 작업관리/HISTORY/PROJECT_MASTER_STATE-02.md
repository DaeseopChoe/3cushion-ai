본 문서는 3Cushion AI 프로젝트의
현재 구조, 계산 체계, 안정 상태, 남은 이슈를 통합 기록하는
운영 기준 문서이다.

이 문서는 월 단위로 업데이트하며,
새 채팅창 작업의 기준점으로 사용한다.

---

# 1️⃣ 현재 실제 폴더 구조 (Frontend 기준)

frontend/
 ├── src/
 │    ├── admin/
 │    │    ├── ai/
 │    │    ├── hpt/
 │    │    ├── str/
 │    │    ├── sys/
 │    │    ├── save/
 │    │    ├── tests/
 │    │    └── AdminContainer.tsx
 │    │
 │    ├── assets/
 │    ├── components/
 │    ├── contexts/
 │    ├── data/
 │    │    └── systems/   (39개 시스템)
 │    │
 │    ├── hooks/
 │    │    ├── useShotSlots.ts
 │    │    └── useTrajectoryState.ts
 │    │
 │    ├── lib/
 │    ├── styles/
 │    ├── utils/
 │    │    ├── systemCalculator.ts
 │    │    ├── trajectorySampleBuilder.ts
 │    │    └── layoutCalculator.js
 │    │
 │    ├── App.jsx
 │    └── main.jsx
 │
 └── docs/
      ├── PROJECT_MASTER_INDEX.md
      ├── FRONTEND_ARCHITECTURE_BASELINE_v1.md
      ├── SYSTEM_ARCHITECTURE.md
      ├── CALCULATION_RULES.md
      └── PROJECT_MASTER_STATE-02.md

---

# 2️⃣ 구조 정리 완료 사항

## ✅ 1. 시스템 폴더 단일화

단일 기준 경로:

frontend/src/data/systems/

- src/systems 제거 완료
- 루트 data 제거 완료
- 중복 systems 제거 완료

---

## ✅ 2. SYSTEM_PROFILES 로딩 방식 통일

기존 (정적 import 방식) 제거

현재:

const modules = import.meta.glob("./*/profile.json", { eager: true });

✔ profile.json만 존재하면 자동 등록
✔ index.ts 수정 필요 없음

---

## ✅ 3. Admin/App 계산 분리 완료

Admin 계산:
src/admin/sys/useSysCalculation.ts

App 계산:
src/utils/systemCalculator.ts
src/utils/trajectorySampleBuilder.ts

---

## ✅ 4. import 경로 전면 정리 완료

현재 정상 기준:

./data/systems
../data/systems
../../data/systems

src/systems 참조 0건
린트 에러 없음
화면 정상 동작

---

# 3️⃣ 계산 흐름 구조 (현재 실제 동작 기준)

## 🔵 Admin 계산 흐름

SysOverlay
   ↓
useSysCalculation
   ↓
SYSTEM_PROFILES[systemId]
   ↓
profile.formula.expr
   ↓
RHS 토큰 파싱
   ↓
new Function 실행
   ↓
(5_half 특수 보정 포함)

특징:
- 좌표 비의존
- 순수 수식 계산
- 실험/디버깅 목적

---

## 🔵 App 계산 흐름

LayoutContext
   ↓
systemCalculator
   ↓
calculateByProfileExpr
   ↓
profile.formula.expr
   ↓
value_domains 검증
   ↓
anchors 기반 보정
   ↓
trajectorySampleBuilder
   ↓
Stage 렌더링

특징:
- 좌표 기반
- 시뮬레이션 목적
- trajectory 생성 포함

---

# 4️⃣ Draft / Applied 설계 원칙

useShotSlots 기반 전략 상태 엔진

ShotEditorState
 ├── activeSlot
 └── slots:
      ├── draft
      └── applied

## Draft

- 실시간 계산 상태
- 자유 수정 가능
- 저장 대상 아님

## Applied

- 검증 완료 전략
- 저장 대상
- trajectory 계산 대상

원칙:

1. Draft는 절대 저장하지 않는다.
2. Applied는 structuredClone으로 깊은 복사한다.
3. 계산 엔진은 시스템 독립적으로 유지한다.

---

# 5️⃣ 전략 → 궤적 → 물리 연결 구조

현재 실제 연결 구조:

StrategyEngine (useShotSlots)
      ↓
applyDraftSys()
      ↓
useTrajectoryState.applySysResult()
      ↓
Trajectory adjusted 상태 갱신
      ↓
App.jsx 내부 Impact 계산
      ↓
Stage SVG 렌더링

⚠ 현재 문제:

물리 엔진(calcImpactBall, calculateImpact 등)이
App.jsx 내부에 존재함.

즉,

App.jsx가
- 전략 연결 허브
- 물리 엔진
- 렌더 엔진
- 인터랙션 엔진

모두 담당하는 상태.

---

# 6️⃣ App.jsx 현재 상태 평가

현재 App.jsx는:

슈퍼 컨트롤러

담당 기능:

1. SVG 렌더링
2. 좌표계 변환(Fg / Rg / px)
3. ImpactBall 계산
4. 물리 보정
5. Admin 모드 라우팅
6. 드래그/조이스틱 엔진
7. 전략/궤적 연결 브리지

⚠ 기술 부채:

- 3000+ 라인 집중
- 물리/기하 로직 분리 미완성
- Admin/User 분기 내부 혼재
- 계산 계층과 렌더 계층 혼합

---

# 7️⃣ 아직 검증 필요 이슈

## ⚠ fg → rg 투영 로직

실제 코드 존재 여부 확인 필요:

fg
rg
projection
compensate

CALCULATION_RULES.md와 코드 대조 필요.

---

## ⚠ 0.75 보정 로직

존재 위치 확인 필요:

profile?
useSysCalculation?
systemCalculator?

대화 기반 설계인지,
실제 코드 구현인지 확인 필요.

---

# 8️⃣ Knowledge 운영 전략 (확정)

Knowledge에는 다음 3문서만 유지:

1️⃣ PROJECT_MASTER_INDEX.md  
2️⃣ SYSTEM_ARCHITECTURE.md  
3️⃣ CALCULATION_RULES.md  

이 문서(PROJECT_MASTER_STATE)는
상태 기록/월별 통합 문서로 유지.

❌ 저장 금지:
- 임시 스크립트
- 생성기 python
- preset JSON
- schema 파일

---

# 9️⃣ 현재 프로젝트 상태 요약 (2026-02)

항목 | 상태
-----|------
폴더 구조 | 안정
SYSTEM_PROFILES | 동적 로딩
Admin/App 분리 | 명확
중복 systems | 제거 완료
문서 체계 | 1차 정비 완료
계산 로직 정밀 검증 | 진행 필요
물리 엔진 분리 | 미완료

---

# 🔥 최종 판단

현재 상태는:

구조 정리 80% 완료
계산 체계 정밀화 30%
아키텍처 리팩터링 대기 상태

이 문서를 기준으로
Phase 2 리팩터링을 진행한다.

---

# 9️⃣ 문서 체계 안정화 완료 (2026-02 추가 기록)

2026-02 시점에서 문서 체계 v1이 공식 확정되었다.

## 확정된 문서 체계 (6문서 구조)

| 문서 | 역할 |
|------|------|
| PROJECT_MASTER_INDEX | 프로젝트 헌법 |
| FRONTEND_ARCHITECTURE_BASELINE | UI/레이어 구조 기준선 |
| SYSTEM_ARCHITECTURE | 계산 구조 및 데이터 계층 |
| CALCULATION_RULES | expr / 수식 표준 |
| PROJECT_MASTER_STATE_CURRENT | 현재 코드 상태 스냅샷 |
| CURRENT_CODE_SNAPSHOT_SUMMARY | 경미 변경 기록 |

---

## 운영 프로토콜 확정

SESSION CHANGE DECISION PROTOCOL 도입:

다음 중 하나라도 발생하면  
→ PROJECT_MASTER_STATE_CURRENT 전면 재작성

□ 폴더/파일 구조 변경  
□ 계산 흐름 변경  
□ Draft/Applied 구조 변경  
□ 전략 → 궤적 → 물리 파이프라인 변경  
□ 저장 포맷 변경  
□ 물리 계산 로직 변경  

위 항목이 없으면  
→ CURRENT_CODE_SNAPSHOT_SUMMARY만 업데이트

---

## 의미

이 시점부터:

- HISTORY 문서는 "기록"
- CURRENT는 "현재 코드 스냅샷"
- SUMMARY는 "경미 변경 로그"

역할이 명확히 분리되었다.
