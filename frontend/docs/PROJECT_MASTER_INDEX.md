# 3Cushion AI – Project Master Index

> 본 문서는 3Cushion AI 프로젝트의 최상위 기준 문서이다.
> 모든 구조, 계산 로직, Admin/UI 흐름은 이 문서를 기준으로 한다.

---

# 1. 프로젝트 개요

3Cushion AI는 국제식 3쿠션 시스템을

- 데이터화
- 검증
- 시뮬레이션
- 계산 자동화

하기 위한 분석 전용 시스템이다.

Frontend: React (Vite)  
계산 구조: profile / anchors / logic 기반  
Admin 계산: useSysCalculation  
App 계산: systemCalculator + trajectoryBuilder  

---

# 2. 시스템 데이터 구조

모든 시스템 데이터는 다음 위치에 존재한다:

frontend/src/data/systems/

각 시스템 폴더 구조:

system_name/
├─ profile.json
├─ anchors.json
├─ logic.json
└─ system_meta.json


## profile.json 역할
- formula.expr 정의
- value_domains 정의
- safety 규칙
- space_rule 정의
- UI 표시 기준

## anchors.json 역할
- 좌표 기반 샘플 데이터
- 궤적 검증용 기준점

## logic.json 역할
- 보정 규칙
- 특수 분기
- system-specific 조건 처리

---

# 3. 시스템 등록 방식

SYSTEM_PROFILES는 아래 경로에서 자동 수집된다:

frontend/src/data/systems/index.ts

```ts
const modules = import.meta.glob("./*/profile.json", { eager: true });
→ profile.json만 존재하면 자동 등록됨
→ 수동 import 절대 금지

4. 계산 엔진 구조
4.1 Admin 계산
파일:
frontend/src/admin/sys/useSysCalculation.ts

특징:

profile.formula.expr 기반 순수 수식 계산

anchors 비의존

system_values 직접 입력

RHS 토큰 파싱 후 evaluate

특수 처리:

5_half_system 분기 보정 포함

4.2 App 계산
파일:
frontend/src/utils/systemCalculator.ts
frontend/src/utils/trajectorySampleBuilder.ts

흐름:

profile 로드

value_domains 검증

anchors 기반 보정

trajectory 생성

LayoutContext 반영

5. Layout 구조
LayoutContext:
frontend/src/contexts/LayoutContext.jsx

역할:

현재 선택 시스템 관리

계산 결과 상태 관리

Stage 컴포넌트와 연동

6. Admin 구조
frontend/src/admin/

구성:

AdminContainer.tsx

sys/

hpt/

str/

ai/

save/

Admin은 App 계산과 완전히 분리된 독립 계산 모드이다.

7. 데이터 표기 규칙
시스템 값 표기 통일:

1C → C1
2C → C2
3C → C3
...
6C → C6

역방향 표기 금지.

8. 주요 버그 히스토리
Maximum Update Depth exceeded
원인:
useEffect 내부 상태 재파생 구조 문제

해결:
파생 상태 계산 분리

systems 경로 중복 문제
src/systems 제거
src/data/systems 단일화

9. 현재 안정 상태 (2026-02)
src/systems 제거 완료

SYSTEM_PROFILES 단일화 완료

Admin import 경로 정리 완료

dist 제거 완료

docs 구조 정리 완료

10. 향후 작업
SYSTEM_ARCHITECTURE.md 고도화

CALCULATION_RULES.md 정밀화

trajectory 파이프라인 도식화