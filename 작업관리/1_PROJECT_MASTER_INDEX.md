본 문서는 3Cushion AI 프로젝트의 **최상위 기준 문서(Constitution)**이다.
모든 구조, 계산 로직, Admin/UI 흐름은 이 문서를 기준으로 한다.
하위 문서는 본 문서를 보조하는 세부 명세서이다.

1. 프로젝트 정의
1.1 목적

3Cushion AI는 국제식 3쿠션 시스템을

데이터화

검증

시뮬레이션

계산 자동화

하기 위한 분석 전용 시스템이다.

1.2 기술 스택

Frontend: React (Vite)
언어: TypeScript + JSX
계산 구조: profile / anchors / logic 기반 데이터 드리븐 구조
Admin 계산: useSysCalculation
App 계산: systemCalculator + trajectorySampleBuilder

2. 현재 실제 폴더 구조 (2026-02 기준)
frontend/src/
 ├── admin/
 │   ├── sys/
 │   ├── hpt/
 │   ├── str/
 │   ├── ai/
 │   ├── save/
 │   └── AdminContainer.tsx
 │
 ├── components/
 ├── contexts/
 ├── data/
 │   └── systems/   (39개 시스템)
 │
 ├── hooks/
 │   ├── useShotSlots.ts
 │   └── useTrajectoryState.ts
 │
 ├── utils/
 │   ├── systemCalculator.ts
 │   ├── trajectorySampleBuilder.ts
 │   └── layoutCalculator.js
 │
 ├── App.jsx
 └── main.jsx


src/systems는 제거되었으며,
src/data/systems 단일 구조로 확정되었다.

3. 시스템 데이터 구조 (Data Driven Architecture)

모든 시스템은 코드가 아니라 JSON 기반 데이터로 정의된다.

frontend/src/data/systems/

system_name/
├─ profile.json
├─ anchors.json
├─ logic.json
└─ system_meta.json

3.1 profile.json 역할

formula.expr 정의

value_domains 정의

safety 규칙

space_rule 정의

UI 표시 기준

3.2 anchors.json 역할

좌표 기반 샘플 데이터

궤적 검증용 기준점

Canonical anchor 정의

3.3 logic.json 역할

시스템 특수 보정 규칙

분기 처리

조건 기반 계산 확장

4. 시스템 등록 방식

파일:

frontend/src/data/systems/index.ts

const modules = import.meta.glob("./*/profile.json", { eager: true });


✔ profile.json만 존재하면 자동 등록
✔ 수동 import 금지
✔ 시스템 확장은 JSON 추가만으로 가능

5. 계산 엔진 계층 구조

이 프로젝트는 3계층 계산 구조를 가진다.

5.1 Strategy Engine (전략 엔진)

파일:

useShotSlots.ts

역할

Draft / Applied 상태 관리

SYSTEM_PROFILES 기반 계산 실행

calculateByProfileExpr 호출

저장 포맷 v1.4 생성

핵심 설계 원칙
상태	의미
Draft	실시간 계산 상태
Applied	확정된 전략 상태

✔ Draft는 저장하지 않는다
✔ Applied만 저장한다
✔ trajectory는 Applied 기준으로 생성한다

5.2 Trajectory Engine (궤적 상태 엔진)

파일:

useTrajectoryState.ts

역할

상태 전이 관리

IDLE → ADJUSTING → APPLIED

Strategy 결과를 UI 반영 상태로 변환

⚠ 현재 track 값은 일부 하드코딩 상태

5.3 Physics Engine (물리 엔진)

현재 위치:

App.jsx 내부


주요 함수:

calcImpactBall

calculateImpact

determineRotation

adjustSystemLine

⚠ App.jsx 내부에 직접 존재
⚠ 향후 utils/physics로 분리 대상

6. Admin 계산 구조
6.1 Admin 계산 (순수 수식 엔진)

파일:

frontend/src/admin/sys/useSysCalculation.ts


특징:

profile.formula.expr 기반 계산

anchors 비의존

RHS 토큰 파싱 후 evaluate

5_half_system 특수 분기 포함

6.2 App 계산 (실제 궤적 계산)

파일:

systemCalculator.ts
trajectorySampleBuilder.ts


흐름:

profile 로드
   ↓
value_domains 검증
   ↓
anchors 기반 보정
   ↓
trajectory 생성
   ↓
LayoutContext 반영

7. 데이터 흐름 다이어그램 (핵심)
SysOverlay 입력
   ↓
updateDraftSys()
   ↓
calculateByProfileExpr()
   ↓
draft.sys
   ↓
applyDraftSys()
   ↓
applied.sys
   ↓
useTrajectoryState.applySysResult()
   ↓
Physics 계산 (Impact)
   ↓
Stage 렌더링

8. Layout 구조

파일:

frontend/src/contexts/LayoutContext.jsx


역할:

현재 선택 시스템 관리

계산 결과 상태 관리

Stage 렌더링 연동

9. App.jsx 현재 상태 진단

App.jsx는 현재:

SVG 렌더 엔진

좌표 변환 엔진

Impact 물리 계산

관리자 모드 분기

Strategy → Trajectory 연결 허브

을 모두 담당하는 슈퍼 컨트롤러 상태이다.

⚠ 문제점:

파일 규모 과대

계산/렌더/상태 혼합

Physics 분리 필요

Orchestrator 분리 필요

10. 데이터 표기 규칙

표기 통일:

1C → C1
2C → C2
3C → C3
4C → C4
5C → C5
6C → C6

역방향 표기 금지.

11. 주요 버그 히스토리
Maximum Update Depth exceeded

원인:

useEffect 내부 상태 재파생 구조

해결:

파생 상태 계산 분리

systems 경로 중복 문제

src/systems 제거

src/data/systems 단일화 완료

12. 현재 안정 상태 (2026-02 Baseline)

src/systems 제거 완료

SYSTEM_PROFILES 단일화 완료

Admin import 경로 정리 완료

dist 제거 완료

docs 구조 정리 완료

Draft/Applied 구조 고정

Save 포맷 v1.4 확정

13. 향후 작업 (Roadmap)

PhysicsEngine 분리

TrajectoryEngine 순수 함수화

App.jsx 슬림화

계산 파이프라인 완전 분리

SYSTEM_ARCHITECTURE.md 고도화

CALCULATION_RULES.md 정밀화

trajectory 파이프라인 도식화

🔒 최종 선언

본 문서는 3Cushion AI의
프론트엔드 구조 / 계산 철학 / 데이터 설계의 공식 기준 문서이다.

모든 변경은 이 문서를 기준으로 한다.