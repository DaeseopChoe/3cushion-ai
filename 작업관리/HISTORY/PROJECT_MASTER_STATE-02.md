# PROJECT_MASTER_STATE (2026-02 공식 기준)

본 문서는 3Cushion AI 프로젝트의
현재 구조, 상태 모델, 전략 출력 체계,
HPT 설계 상태를 통합 정의하는 공식 기준 문서이다.

이 문서는 월 단위 기준선으로 사용한다.

---

# 1️⃣ 현재 프로젝트 상태 요약 (2026-02)

| 항목 | 상태 |
|------|------|
| 폴더 구조 | 안정 |
| SYSTEM_PROFILES | 동적 로딩(import.meta.glob) |
| Admin/App 계산 분리 | 완료 |
| HPT 모델 | 극좌표 기반 모델 도입 |
| SYS → HPT 투영 | 부호 기반 방향 결정으로 안정화 |
| AI 전략 출력 체계 | 확정 |
| STR 기본값 | 확정 |
| 원 포인트 레슨 | 도입 완료 |
| Drag & Drop | 도입 완료 |
| App.jsx 구조 | 슈퍼 컨트롤러 상태 유지 |
| 물리 엔진 분리 | 미완료 |

현재 상태는 **구조 안정화 1차 완료 단계**이다.

---

# 2️⃣ 계산 구조 (변경 없음)

## 🔵 Admin 계산

```
SysOverlay
   ↓
useSysCalculation
   ↓
profile.formula.expr
   ↓
new Function 실행
```

좌표 비의존 순수 수식 계산.

---

## 🔵 App 계산

```
LayoutContext
   ↓
systemCalculator
   ↓
calculateByProfileExpr
   ↓
trajectorySampleBuilder
   ↓
Stage 렌더링
```

좌표 기반 시뮬레이션 구조.

계산 엔진 자체는 이번 세션에서 변경 없음.

---

# 3️⃣ HPT 모델 (2026-02 기준)

## 🔴 핵심 변화

기존 좌표 기반 관리 → 극좌표 기반 모델로 전환.

```ts
type HptState = {
  hp: { x: number; y: number };
  T: string;
  mode: "TIP" | "SPIN";
};
```

**내부 파생 구조**

- theta
- tipLevel (0~4)
- hpN (파생값)
- clockText (파생값)

---

## 🔵 SYS → HPT 투영 구조 확정

**기존 문제:**

- hpt.hpDirection 기준 방향 적용
- SYS 결과와 충돌 가능

**현재 확정 구조:**

```ts
dir = sysHpNResult >= 0 ? "right" : "left"
tip = clamp(abs(sysHpNResult), 0, 4)
setHpFromTip(dir, tip)
```

- ✔ 방향 충돌 해결
- ✔ 음수 clamp 문제 해결
- ✔ SYS 계산값 정확히 투영

---

## 🟡 HPT 남은 과제

- SYSTEM / FREE 모드 완전 분리
- 외곽 강제 투영 SYSTEM 전용화
- RG ↔ TIP 변환 기준 문서화
- clock 매핑 확정

현재는 "안정화 진행 중" 상태.

---

# 4️⃣ AI 전략 출력 체계 (확정)

AI 문장은 템플릿 기반으로 고정되었다.

## 🔵 SYS 기반 시스템

- 도착값/1쿠션 존재 시 문장 삽입
- 값이 null이면 해당 문장 제거

## 🟢 HP_n 기반 시스템

- 도착/1쿠션 문장 생략
- 타점 문장 필수 출력

## 🔵 타점 표현 규칙

**형식:**

- 우측 3팁 (2시 15분)
- HP_n 약어 사용자 노출 금지
- 소수 1자리 허용
- 시침 기준 표현

## 🔵 STR 기본값 확정

- 스트로크 타입: null (출력하지 않음)
- 가속 패턴: 부드러운 등속
- 목표 속도: 2.5 레일
- 스트로크 깊이: 1.5 Ball
- 타격 강도: 평범한

STR 문장은 항상 출력.

---

# 5️⃣ 전략 출력 UI 구조

전략 출력은 textarea 기반에서 문서형 div 구조로 변경되었다.

**출력 구조:**

- AI 코멘트
- 원 포인트 레슨 (다중 지원)

출력 계층과 입력 계층 분리 완료.

---

# 6️⃣ 원 포인트 레슨 시스템

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

**기능**

- 다중 레슨 지원
- localStorage 라이브러리 저장
- Drag & Drop 정렬
- Delete 키 삭제
- hover 시 핸들 표시

관리자 인터랙션은 사용자 UI에 영향 없이 분리 설계됨.

---

# 7️⃣ App.jsx 현재 평가

App.jsx는 여전히:

- 전략 연결 허브
- 물리 엔진
- 렌더 엔진
- 인터랙션 엔진

을 모두 담당하는 슈퍼 컨트롤러 상태.

기술 부채는 유지 중이나 현재 세션에서는 구조 안정화에 집중.

---

# 8️⃣ Phase 2 준비 상태

**현재 시점은:**

- HPT 모델 전환 시작
- AI 전략 체계 확정
- 출력 구조 확정

**다음 단계는:**

- HPT SYSTEM/FREE 모드 완전 분리
- 물리 엔진 분리
- 계산 계층과 렌더 계층 분리

---

# 🔥 최종 판단 (2026-02 기준)

현재 구조는:

- 계산 엔진 안정
- 전략 출력 체계 확정
- HPT 구조 1차 안정화

이 시점을 Phase 2 리팩터링의 기준선으로 사용한다.
