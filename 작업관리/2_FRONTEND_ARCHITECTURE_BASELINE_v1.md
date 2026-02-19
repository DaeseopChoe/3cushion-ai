버전: v1.1 (Official Baseline)
기준: 2026-02 안정 구조
목적: 현재 “동작하는 구조”를 공식 아키텍처로 고정하고, 향후 리팩터링 기준점으로 삼는다.

본 문서는 **프론트엔드 구조와 레이어 분해, 리팩터링 기준선**을 정의한다.
계산 로직과 시스템 데이터 구조는 SYSTEM_ARCHITECTURE 문서에서 관리한다.

1️⃣ 실제 현재 폴더 구조 (고정 기준)
frontend/src/
 ├── admin/
 ├── assets/
 ├── components/
 ├── contexts/
 ├── data/
 │   └── systems/ (39 systems)
 ├── hooks/
 │   ├── useShotSlots.ts
 │   └── useTrajectoryState.ts
 ├── lib/
 ├── styles/
 ├── utils/
 │   ├── systemCalculator.ts
 │   ├── trajectorySampleBuilder.ts
 │   └── layoutCalculator.js
 ├── App.jsx
 └── main.jsx


✔ src/systems 제거 완료
✔ src/data/systems 단일화 완료

2️⃣ 핵심 아키텍처 개념 – 6 Layer 모델

현재 프론트엔드는 기능적으로 6개의 레이어가 존재한다.

Layer	역할	현재 위치
Rendering	SVG 테이블/공/가이드	App.jsx
Geometry	Fg/Rg/px 변환	App.jsx + lib
Physics	ImpactBall 계산	App.jsx
System	Expr 기반 계산	utils/systemCalculator
State	Draft/Applied, Trajectory	hooks
Interaction	Drag/Joystick	App.jsx

⚠ 현재는 대부분이 App.jsx에 결합되어 있다.

3️⃣ Draft / Applied 설계 원칙 (공식 선언)

이 프로젝트의 핵심 설계 철학:

Draft

실시간 계산 상태

수정 중 상태

Preview

Applied

확정 상태

저장 대상

trajectory 생성 기준

✔ Draft는 절대 저장하지 않는다.
✔ Applied만 저장한다.
✔ trajectory는 Applied 기준으로만 생성한다.

이 구조는 게임 엔진의 Preview vs Commit 패턴과 동일하다.

4️⃣ 전략 → 궤적 → 물리 파이프라인 (공식 흐름)
SysOverlay 입력
   ↓
Draft 계산
   ↓
Applied 확정
   ↓
Trajectory 반영
   ↓
Physics 계산
   ↓
Stage 렌더링

(상세 단계는 SYSTEM_ARCHITECTURE 6️⃣ 참조)

5️⃣ App.jsx 현재 상태 진단 (중요)

App.jsx는 현재:

렌더 엔진

좌표 변환 엔진

Impact 물리 계산 엔진

관리자 모드 엔진

전략 연결 허브

인터랙션 엔진

을 모두 담당하는 슈퍼 컨트롤러 상태이다.

기술 부채:

파일 규모 과대 (3000+ 라인)

물리 엔진이 UI 내부에 존재

ADMIN / USER 분기 혼합

계산 계층과 렌더 계층 혼합

6️⃣ useShotSlots – 전략 엔진 정의

정체: Shot Strategy Editor State Engine

상태 구조:

S1 | S2 | S3
  ├── draft
  └── applied


핵심 함수:

updateDraftSys()

applyDraftSys()

validateDraft()

saveShot()

저장 포맷 v1.4 고정.

7️⃣ useTrajectoryState – 궤적 상태 머신

상태 전이:

IDLE → ADJUSTING → APPLIED


⚠ 현재 derived.track 일부 하드코딩 상태
⚠ 실제 물리엔진과 완전 연결은 Phase 2 대상

8️⃣ systems 데이터 드리븐 설계

39개 시스템 × 동일 구조. 코드가 아니라 데이터로 시스템 확장.
계산 구조 상세는 SYSTEM_ARCHITECTURE 참조.

9️⃣ 계산 코어 – systemCalculator.ts

SYSTEM_PROFILES 기반 계산. 구조도상 “System Engine Core” 위치. 계산 규칙 상세는 SYSTEM_ARCHITECTURE 참조.

🔟 Phase 2 리팩터링 청사진

목표:

StrategyEngine
   ↓
TrajectoryEngine
   ↓
PhysicsEngine
   ↓
RenderEngine


실행 순서:

Physics 로직 분리

Geometry 로직 분리

AdminContainer 완전 분리

App.jsx 슬림화