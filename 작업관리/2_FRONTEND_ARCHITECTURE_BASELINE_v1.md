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

------------------------------------------------------------

## 🔄 2026-02 프론트엔드 구조 업데이트 (HPT/AI 구조 안정화)

### 1. HPT 상태 구조 확정 (SSOT 기반)

HPT는 단일 책임 상태 구조로 확정되었다.

```ts
type HptState = {
  hp: { x: number; y: number };
  T: string;
  mode: "TIP" | "SPIN";
};
```

**구조 원칙**

- mode는 HPT의 표현 방식(TIP / SPIN)을 결정한다.
- hp는 항상 실제 좌표값을 기준으로 관리한다.
- parent ↔ controller 간 역주입 시 clamp는 controller 책임으로 한정한다.
- 단일 clamp 책임 구조 유지.

---

### 2. SYS → HPT 데이터 흐름 정리

**기존 문제**

- SYS 계산 결과 적용 시 hpt.hpDirection을 사용
- 현재 hp 방향과 SYS 결과 방향이 충돌 가능

**수정 구조**

```ts
const dir = sysHpNResult >= 0 ? "right" : "left";
const tip = clamp(Math.abs(sysHpNResult), 0, 4);
hpt.setHpFromTip(dir, tip);
```

**결과**

- SYS 계산값이 HPT UI에 정확히 투영됨
- 방향성 충돌 제거
- 음수 tip clamp 문제 해결

---

### 3. AI 코멘트 계층 구조 정리

AI 코멘트는 다음 계층 구조를 따른다:

```
HPT 상태 → buildPlayStrategyText()
        → buildPlayStrategy()
        → 전략 문장 생성
```

**개선 사항**

- 값 존재 시에만 문장 삽입
- SYS 도착값 / 1쿠션 개별 분기
- TIP / SPIN 모드 기반 문장 분기
- BANK 두께 처리 추가

AI 생성 로직은 현재 안정된 상태이다.

---

### 4. 전략 문서형 출력 계층 도입

**기존:**

- textarea 기반 편집형 출력

**변경:**

- div 기반 문서형 출력
- 자동 높이
- 읽기 전용 전략 박스 구조
  - AI 코멘트
  - 원 포인트 레슨

출력 계층과 입력 계층이 명확히 분리되었다.

---

### 5. 원 포인트 레슨 관리 계층 추가

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

**기능**

- 라이브러리 기반 누적 저장 (localStorage)
- 빈도 기반 정렬 유지
- 전략 문서 출력 계층에 통합
- 다중 레슨 지원

---

### 6. 관리자 전용 인터랙션 계층

관리 기능은 문서 UI를 변경하지 않는 방식으로 설계되었다.

- 클릭 → 선택 (하이라이트)
- Delete 키 → 삭제
- Drag handle → 정렬
- hover 시 핸들 표시

사용자 UI에서는 관리 기능을 숨길 수 있는 구조로 설계됨.

---

### 7. Drag & Drop 계층 추가

**신규 의존성:**

- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

Drag 계층은 전략 문서 레벨에 영향을 주지 않고 상태 정렬에만 영향을 준다.

---

### 📌 현재 프론트엔드 구조 상태

현재 프론트엔드는 다음과 같은 계층으로 안정화되었다:

1. **계산 계층** (SYS / HPT)
2. **상태 계층** (HptState + mode)
3. **전략 생성 계층** (AI 코멘트)
4. **전략 출력 계층** (문서형 UI)
5. **관리자 인터랙션 계층** (삭제/정렬)
6. **라이브러리 저장 계층** (localStorage)

본 구조는 2026-02 기준 안정화된 아키텍처 베이스라인이다.