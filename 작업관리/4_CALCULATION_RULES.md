본 문서는 3Cushion AI의 계산 엔진 공식 규칙 문서이다.
expr 평가 방식, 보정 규칙, Admin/App 모드 차이, 상태 반영 파이프라인을 정의한다.

1️⃣ 현재 계산 관련 파일 구조
frontend/src/
 ├── admin/sys/useSysCalculation.ts
 ├── utils/systemCalculator.ts
 ├── utils/trajectorySampleBuilder.ts
 ├── hooks/useShotSlots.ts
 ├── hooks/useTrajectoryState.ts
 └── data/systems/<systemId>/
        ├── profile.json
        ├── anchors.json
        ├── logic.json
        └── system_meta.json

2️⃣ 계산 엔진 계층 정의

계산은 3단계로 이루어진다.

[System Engine]
   ↓
[Strategy Engine]
   ↓
[Trajectory Engine]
   ↓
[Physics Engine]

3️⃣ 표기 규칙 (Naming Convention)
3.1 시스템 값 표기
허용	금지
C1, C2, C3 ... C6	1C, 2C
3.2 좌표 기준 표기

_f → Frame Grid

_r → Rail Grid

예:

C1_f
C3_r

4️⃣ profile.formula.expr 규칙
4.1 기본 형식
"LHS = RHS"


예:

C1_f = CO_f - C3_r

4.2 평가 절차

문자열 분리 (LHS / RHS)

RHS 토큰화

입력 변수 매핑

new Function 생성

RHS 실행

LHS 결과 반환

5️⃣ RHS 허용/금지 규칙
허용

변수명

숫자

/ ( )

Math 객체

금지

외부 객체 접근

anchors 직접 참조

window / document 접근

6️⃣ Admin 계산 규칙

파일:

admin/sys/useSysCalculation.ts


특징:

anchors 비의존

expr 기반 직접 계산

system_values에서 RHS 변수만 사용

미입력 값은 0 처리

Admin은 실험/디버깅 모드이며,
물리 보정은 적용하지 않는다.

7️⃣ App 계산 규칙

파일:

utils/systemCalculator.ts


App 계산은 다음 단계를 따른다:

profile 로드

value_domains 검증

space_rule 검증

calculateByProfileExpr 실행

anchors 기반 보정 적용

trajectorySampleBuilder 호출

8️⃣ Draft / Applied 반영 규칙

계산 결과는 다음 순서로 상태에 반영된다.

calculateByProfileExpr()
   ↓
draft.sys.outputs.result
   ↓
applyDraftSys()
   ↓
applied.sys
   ↓
useTrajectoryState.applySysResult()


✔ Draft는 실시간 계산
✔ Applied만 확정

9️⃣ 전략 → 궤적 → 물리 연결 구조
expr 계산
   ↓
System result
   ↓
Trajectory adjusted
   ↓
Physics (Impact 계산)
   ↓
Stage 렌더

🔟 5_half_system 특수 보정 규칙

공식:

Sn = (CO_f - 50) * 0.5
C4_f = C3_r + Sn
C5_f = C4_f
C6_f = C4_f


적용 위치:

logic.json

계산 엔진 내부 분기

1️⃣1️⃣ value_domains 규칙

각 profile.json에는 입력 허용 범위가 정의된다.

검증 실패 시:

계산 중단

Draft에 반영하지 않음

1️⃣2️⃣ 안전 규칙 (Safety Rules)

계산은 순수 함수로 유지

useEffect에서 재계산 금지

계산 결과는 상태 외부에서 변형 금지

Draft/Applied 직접 변경 금지

1️⃣3️⃣ trajectorySampleBuilder 규칙

입력:

applied.sys

systemId

출력:

trajectorySamples (파생 데이터)

⚠ Draft는 절대 사용하지 않는다.

1️⃣4️⃣ impact/final 계산 엔진 (2026-03 추가)

- evaluateStrategy.ts: balls + sysInputs → userImpact, userFinal
- userImpact: calcImpactBall(cue, target, T)
- userFinal: finalCoordinateEngine.computeFinalCoord (C1 보간, 5_half_system / n_across_short)
- adminSaveEngine.buildStrategyMeta에서 evaluateStrategy 호출 → StrategyMeta 생성

1️⃣4️⃣-1 StrategyMeta (StrategyEntry 저장 시)

**계산 위치:** buildStrategyMeta() [adminSaveEngine], evaluateStrategy [domain]

**입력:** balls, sysInputs, signature, slot

**출력 (StrategyMeta):**
- impact (Point): userImpact
- final (Point): userFinal
- angle_ci: cue → impact 방향 (atan2)
- angle_fs: final → second 방향 (atan2)

1️⃣5️⃣ App.jsx 현재 상태 반영

현재 Phase 1에서는:

Physics 계산이 App.jsx 내부에 존재

expr 계산과 물리 계산이 완전 분리되어 있지 않음

TrajectoryEngine과 PhysicsEngine의 경계가 명확하지 않음

Phase 2 목표:

PhysicsEngine 순수 함수화

Strategy → Trajectory → Physics 파이프라인 명확화

1️⃣6️⃣ 새 시스템 추가 절차 (공식 프로토콜)

profile.json 작성

anchors.json 작성

logic.json 작성

value_domains 정의

formula.expr 정의

Admin 계산 검증

App 시뮬레이션 검증

trajectory 저장 테스트

📌 최종 선언

이 문서는 3Cushion AI 계산 엔진의 공식 규칙이다.
모든 계산 변경은 본 문서 대비 변경점으로 기록한다.