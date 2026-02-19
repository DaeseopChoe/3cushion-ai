# PROJECT_MASTER_STATE_CURRENT
3Cushion AI – Current Code State Snapshot
Version: vX.X
Last Updated: YYYY-MM-DD
Owner: 목계님

------------------------------------------------------------
이 문서는 “현재 실제 코드 상태”만 기록한다.
설명/이론/설계 철학은 포함하지 않는다.
구조 변경 시 전체를 재작성한다.

이 문서는 구조 붕괴 방지를 위한 통제 문서이다.
아래의 SESSION CHANGE DECISION PROTOCOL이
이 문서의 유일한 재작성 기준이다.

⚠ 구조 변경 항목이 감지되면,
ChatGPT는 작업을 계속하기 전에
반드시 "MASTER_STATE_CURRENT 전면 재작성 권고" 메시지를 먼저 출력한다.

------------------------------------------------------------
# 🔴 SESSION CHANGE DECISION PROTOCOL

작업 도중 아래 항목 중 하나라도 발생하면:

□ 폴더/파일 구조 변경
□ 계산 흐름 변경
□ Draft/Applied 구조 변경
□ 전략 → 궤적 → 물리 파이프라인 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경

→ ChatGPT는 즉시 아래 메시지를 출력해야 한다:

"⚠ 구조 변경 감지되었습니다.
PROJECT_MASTER_STATE_CURRENT를 전면 재작성하시겠습니까?"

사용자는 반드시:
1) 전면 재작성
또는
2) 구조 변경이 아님을 명시적으로 선언

둘 중 하나를 선택해야 한다.

--------------------------------------------

위 항목이 모두 해당되지 않는 경우:

→ CURRENT_CODE_SNAPSHOT_SUMMARY.md만 업데이트한다.

------------------------------------------------------------

# 1. 현재 실제 폴더 구조 (Frontend 기준)

frontend/src/

admin/
  ai/
  hpt/
  str/
  sys/
  save/
  tests/
  AdminContainer.tsx

components/
contexts/
data/
  systems/ (39개 시스템)
hooks/
  useShotSlots.ts
  useTrajectoryState.ts
utils/
  systemCalculator.ts
  trajectorySampleBuilder.ts
  layoutCalculator.js

App.jsx
main.jsx

※ 이 구조는 현재 실제 코드 기준이며, 변경 시 본 섹션 전체 수정.

------------------------------------------------------------

# 2. App.jsx 현재 상태 평가

App.jsx는 현재:

□ 슈퍼 컨트롤러 상태
□ 물리 엔진 포함
□ Geometry 변환 포함
□ Admin 모드 분기 포함
□ Drag/Interaction 포함

현재 상태 설명:

- Rendering / Geometry / Physics / Admin Routing / State Bridge가 한 파일에 결합
- calcImpactBall, determineRotation 등 물리 로직이 App 내부 존재
- TrajectoryState는 상태 관리만 수행 (물리 계산 미연결)
- derived.track는 아직 하드코딩 상태

※ App.jsx가 분리되면 이 항목은 반드시 갱신

------------------------------------------------------------

# 3. 전략 엔진 상태 (useShotSlots)

현재 구조:

Draft / Applied 분리 유지
3 Slot 구조 (S1 / S2 / S3)

updateDraftSys 흐름:
input 병합 → base 고정 → SYSTEM_PROFILES 조회 →
calculateByProfileExpr 실행 →
draft.sys.outputs.result 생성

applyDraftSys:
structuredClone 기반 확정

saveShot:
Applied만 저장
trajectorySamples 파생 생성
version: v1.4

------------------------------------------------------------

# 4. 궤적 엔진 상태 (useTrajectoryState)

상태 머신:

IDLE → ADJUSTING → APPLIED

현재 문제점:

- 실제 물리 트랙 계산 미연결
- derived.track 하드코딩
- App.jsx 브리지 의존

------------------------------------------------------------

# 5. 전략 → 궤적 → 물리 연결 구조 (현재)

Admin SysOverlay
   ↓
calculateByProfileExpr
   ↓
useShotSlots.updateDraftSys
   ↓
applyDraftSys
   ↓
useTrajectoryState.applySysResult
   ↓
App.jsx 물리 계산
   ↓
Stage 렌더

※ 파이프라인 분리 미완성 상태

------------------------------------------------------------

# 6. 현재 기술 부채 (Technical Debt)

□ App.jsx 과대 집중
□ Physics 모듈 분리 필요
□ derived.track 미구현
□ Geometry/Physics 혼합
□ Admin/User 분기 통합

------------------------------------------------------------

# 7. 세션 종료 체크 프로토콜 (강제 실행)

새 채팅창으로 이동하기 전 반드시 실행:

1. 오늘 변경 사항 요약
2. 아래 항목 체크

[CHECK]

□ 폴더 구조 변경
□ 계산 로직 변경
□ 상태 엔진 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경
□ 전략→궤적→물리 연결 변경

3. 하나라도 체크되면:

→ PROJECT_MASTER_STATE_CURRENT 전면 재작성
→ Version 증가
→ 날짜 업데이트

4. 체크가 모두 해제라면:

→ 버전 유지
→ 날짜만 갱신 가능

------------------------------------------------------------

# 8. 새 채팅 시작 템플릿 (자동 감지 트리거)

새 채팅창에서 항상 아래 템플릿 사용:

------------------------------------------------------------
프로젝트: 3Cushion AI

업로드 문서:
- PROJECT_MASTER_INDEX
- FRONTEND_ARCHITECTURE_BASELINE
- SYSTEM_ARCHITECTURE
- CALCULATION_RULES
- PROJECT_MASTER_STATE_CURRENT

작업 중 아래 변경이 발생하면
CURRENT 업데이트 필요 여부를 즉시 판단해 주세요:

1. 폴더 구조 변경
2. 계산 흐름 변경
3. Draft/Applied 구조 변경
4. 전략→궤적→물리 파이프라인 변경
------------------------------------------------------------

이 문장을 반드시 포함한다.
이 문장은 구조 붕괴 방지 장치이다.

------------------------------------------------------------

# 9. 문서 운영 규칙

- CURRENT는 누적 로그가 아니다.
- 항상 “현재 코드 상태”만 기록한다.
- 과거 내용은 제거한다.
- 세션 단위로 재작성한다.
- Git 커밋과 함께 관리한다.
