📦 3Cushion AI 프로젝트 이관 문서

(2026-02 정리 완료 기준)

1️⃣ 지금까지 완료된 작업 정리
✅ 1. 폴더 구조 대정리 완료
🔹 제거 완료

frontend/admin (루트 아래 중복 폴더 제거)

frontend/dist (빌드 산출물 제거)

frontend/src/systems (정적 import 기반 시스템 폴더 제거)

루트 public 중복 폴더 제거

루트 data 중복 폴더 제거

루트 tools 폴더 → engine/tools로 이동

✅ 2. 시스템 데이터 구조 통합 완료
🔹 현재 단일 기준 경로
frontend/src/data/systems/


모든 시스템 profile.json은 여기에서만 관리.

🔹 SYSTEM_PROFILES 로딩 방식

이전:

import fiveHalf from "./5_half_system/profile.json";
...
export const SYSTEM_PROFILES = { ... }


현재:

const modules = import.meta.glob("./*/profile.json", { eager: true });


✔ 동적 로딩 방식으로 통일
✔ index.ts 하나로 모든 시스템 자동 등록

이제 시스템 추가 시:

폴더만 생성하면 자동 등록됨

index.ts 수정 필요 없음

✅ 3. import 경로 전면 정리 완료
기존 참조 (문제의 원인)
./systems
../systems
../../src/systems

현재 정상 기준
./data/systems
../data/systems
../../data/systems


✔ src/systems 참조 0건
✔ 린트 에러 없음
✔ 화면 정상 동작

✅ 4. Admin 폴더 src 내부로 통합

이전:

frontend/admin


현재:

frontend/src/admin


Admin 계산은:

src/admin/sys/useSysCalculation.ts


App 계산은:

src/utils/systemCalculator.ts


구조가 명확히 분리됨.

✅ 5. 문서 체계 정리 완료

현재 존재:

frontend/docs/
 ├── PROJECT_MASTER_INDEX.md
 ├── SYSTEM_ARCHITECTURE.md
 ├── CALCULATION_RULES.md
 ├── App_modification_guide.md
 ├── archive/
 ├── architecture/
 ├── modules/

2️⃣ 현재 안정 상태 구조 (중요)
🔵 계산 흐름
Admin 계산 흐름
SysOverlay
  → useSysCalculation
     → SYSTEM_PROFILES[profileKey]
     → formula.expr
     → RHS 토큰 파싱
     → new Function 평가
     → 5_half 보정

App 계산 흐름
LayoutContext
  → systemCalculator
     → calculateByProfileExpr
        → profile.formula.expr
        → 좌표 기반 계산


Admin은 순수 수식 기반
App은 레이아웃 + 좌표 기반

3️⃣ 아직 해결해야 할 핵심 이슈
⚠️ 1. fg → rg 투영 로직 위치 불명확

이전 대화에서 정의했지만:

실제 파일에 구현되었는지?

대화로만 끝났는지?

utils에 있는지?

systemCalculator 안에 있는지?

👉 이 부분 반드시 코드 검색 필요

⚠️ 2. 0.75 보정 로직

시스템값 보정 시:

value * 0.75


이 로직이:

profile 내부?

useSysCalculation?

calculateByProfileExpr?

아니면 대화만 존재?

👉 코드 기준 문서화 필요

⚠️ 3. knowledge 저장소 파일 불일치 가능성

현재 knowledge에 있는 파일들:

profile_template_generator.py

system_logic.schema.json

anchors.schema.json

preset_sunrise_sunset.json

tools_create_system.py

track_selector.py

이 파일들은 초기 설계 기준 파일일 가능성 높음.

현재 프로젝트 구조와 불일치할 확률 있음.

4️⃣ 앞으로 해야 할 일 (우선순위 정리)
🔴 1순위 — 계산 로직 실존 코드 확인

아래 항목을 코드 전체 검색:

fg

rg

0.75

projection

compensate

correction

derive

anchor

→ 존재 여부 파악
→ 없다면 CALCULATION_RULES.md에만 존재하는 설계 개념일 수 있음

🔴 2순위 — SYSTEM_ARCHITECTURE.md 정밀 검증

현재 작성된 문서가:

실제 코드 기준인지

대화 기준 설계인지

검증 필요.

🔴 3순위 — Knowledge 정리 전략 결정

이게 가장 중요.

5️⃣ Knowledge 저장소 운영 전략 (가장 중요)
❗ 절대 원칙

ChatGPT를 기억 저장소로 쓰지 말 것.
문서를 기억 저장소로 써야 함.

🧠 최적 전략

Knowledge에는 3개 문서만 유지

1️⃣ PROJECT_MASTER_INDEX.md

전체 구조

폴더 기준

시스템 등록 규칙

계산 구조 개요

2️⃣ SYSTEM_ARCHITECTURE.md

계산 파이프라인

Admin/App 차이

LayoutContext 구조

profile/logic/anchor 관계

3️⃣ CALCULATION_RULES.md

모든 수학적 규칙

보정 공식

fg→rg 투영

0.75 규칙

5_half 특수 처리

향후 모든 수학 변경 기록

❌ Knowledge에 두지 말 것

임시 스크립트

생성기 python

preset JSON

debug 파일

과거 schema 파일

이것들은 프로젝트 파일에 두면 됨.

6️⃣ 새 채팅창에서 이어가는 방법 (완전 가이드)

새 채팅을 열 때 반드시 아래 템플릿 사용:

프로젝트: 3Cushion AI
Frontend: React + Vite
시스템 데이터 경로: src/data/systems
Admin 계산: useSysCalculation
App 계산: systemCalculator
시스템 로딩: import.meta.glob 기반

다음 문서를 먼저 검토하고 시작:
1) PROJECT_MASTER_INDEX.md
2) SYSTEM_ARCHITECTURE.md
3) CALCULATION_RULES.md

현재 작업 목표:
[여기에 작성]


이렇게 하면 새 채팅창에서도 거의 복구 가능.

7️⃣ 앞으로의 구조 안정화 로드맵
단계 1

계산 로직 실존 여부 정밀 검토

CALCULATION_RULES.md와 코드 대조

단계 2

시스템 등록 체크리스트 문서 생성

시스템 추가 시 프로세스 고정

단계 3

계산 엔진 단위 테스트 도입

5_half, plus, rodriguez 각각 테스트

단계 4

fg → rg → trajectory 흐름 다이어그램화

8️⃣ 현재 프로젝트 상태 요약 (핵심)
항목	상태
폴더 구조	안정
import 경로	통일 완료
SYSTEM_PROFILES	동적 로딩
Admin/App 분리	명확
dist	제거
중복 systems	제거
문서 체계	1차 정비 완료
계산 로직 정밀 검증	아직 필요
🔥 최종 판단

지금 상태는:

구조 정리 80% 완료
계산 체계 정밀화 0~30%
문서 기반 운영 전환 시작 단계

지금이 진짜 시작점이다.

다음 행동 제안

fg / rg / 0.75 로직 코드 실존 여부 검사

Knowledge 정리 (3문서만 유지)

CALCULATION_RULES.md 정밀 재작성 (코드 기준)