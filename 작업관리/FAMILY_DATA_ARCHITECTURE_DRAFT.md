# Family Data Architecture — Design Draft

```
Document  : FAMILY_DATA_ARCHITECTURE_DRAFT.md
Type      : Confirmed Design (not implemented)
Authority : Status/Design — consume via PROJECT_MASTER_INDEX
Date      : 2026-08-17
Status    : CONFIRMED DESIGN · NEXT (Phase 1 Ask)
Not       : IMPLEMENTED · Official Glossary (until GLOSSARY_SSOT cites)
```

> 본 문서는 **아직 구현되지 않은** Family 저장/생성 설계다.  
> 기존 SSOT(Envelope Sampling · Dataset 3계층 · Display Boundary · Calculation Rules)를 **재정의하지 않는다**.  
> 구현 시 production 파생/대칭 규칙을 **새로 해석하지 말고 재사용**한다.

---

## 0. Status split

| Item | Status |
|------|--------|
| Family Master / Member schema | **CONFIRMED DESIGN** · not implemented |
| 4 Track auto-generation | **CONFIRMED DESIGN** · NEXT Phase 2 |
| Derived Members + Search Index | **CONFIRMED DESIGN** · NEXT Phase 3 |
| Admin commands 원본수정 / 파생수정 / 새로저장 | **CONFIRMED DESIGN** · NEXT Phase 4 |
| Existing production derived / symmetry rules | **IMPLEMENTED / SSOT** — reuse; do not reinvent |
| Envelope `cueSet` 1/3 · 1.5gr Sampling | **Architecture Freeze** — Search sampling; **≠** Family derived 2Rg |
| Dataset 3계층 (Working / History / Published) | **IMPLEMENTED** — Family sits on top later; do not collapse History↔Export |
| BUG-A display-cap nearest-rail | **IMPLEMENTED** (uncommitted) — cite LOG 2026-08-17 |
| BUG-B Reset/History stale | **OPEN ISSUE** — separate from Family |

---

## 1. Purpose

관리자가 **기준 데이터 1개**를 입력하면:

1. 나머지 **3 Track**을 대칭으로 생성하고
2. 각 Track의 **파생 Member**를 기존 규칙으로 생성하며
3. 검색은 **Search Index**로 찾고 Family Master를 resolve

하는 구조를 목표로 한다.

현재 구현은 StrategyEntry / `positions_dataset` / History snapshot / Export corpus가 **레코드 단위**로 공통값과 좌표를 함께 들고 있다. Family는 그 중복을 제거하는 **다음 아키텍처**이다.

---

## 2. Family Master

하나의 공략 Family는 공통값 SSOT인 **Family Master**를 가진다.

Master가 대표하는 공통값:

- 공략 (`shotType`)
- 적용 시스템 (`system` identity string, 예: `5_half_system`)
- SYS 계산 규칙 / corrections / 계산 공통값
- AI
- STR
- HP/T **canonical** 기준값
- 두께 **canonical** 기준값
- 기타 Family 전체가 공유하는 공통 모달값

### Mirror 저장 금지

반대 선회 track용 대칭 타점/두께를 **DB에 중복 저장하지 않는다**.

- canonical master 값만 저장
- track handedness가 반대일 때 **resolver**가 표시/계산에 mirror 적용
- 계산값도 동일 Family Master 공통값을 사용

C2는 sys 필드가 아니다 (기존 정책 유지). C2는 reflection geometry derived 값이다.

---

## 3. Member

각 Family Member 최소 필드:

| Field | Role |
|-------|------|
| `memberId` | Member identity |
| `familyId` | Family Master 참조 |
| balls coordinates | Position |
| `track` | `B2T_L` / `B2T_R` / `T2B_L` / `T2B_R` |
| identity / provenance | 아래 권장 값 |

**원본도 Member다.** 최초 입력 위치와 track을 Member 목록에 포함한다.

Member에는 Family 공통값을 **중복 저장하지 않는다**.

권장 provenance:

| provenance | 의미 |
|------------|------|
| `AUTHORED` | 관리자가 직접 입력한 원본 (자동 삭제 금지) |
| `SYMMETRY` | 4 Track 대칭 생성 |
| `DERIVED_CO_C1` | CO–C1 구간 파생 |
| `DERIVED_C3_PLUS` | C3 이후 파생 |

향후 검토 가능: `parentMemberId`, generation rule/version.

---

## 4. 4 Track Family

관리자가 기준 데이터 하나를 입력하면:

- 기준 Member 1개
- 나머지 대칭 Track Member 3개
- **총 4 Track = 하나의 Family** (동급 Member)

기존 Trajectory Symmetry 규칙을 **그대로 사용**한다 (cite: `3_SYSTEM_ARCHITECTURE.md` · anchors JSON H/V/RPI).

- **H** / **V** / **RPI**
- **sys 값 불변**
- **좌표만 대칭**

각 track은 고유 좌표와 `track` 값을 가진다.

반대 선회인 경우에만 호출 시 resolver:

- 두께 mirror
- HPT hit point mirror

DB에 mirrored common values를 별도 저장하지 않는다.

---

## 5. Derived Members

4개 Track 각각은 자신의 파생 Members를 자동 생성한다.

**새 규칙을 만들지 않는다.** 기존 production 파생 규칙을 재사용한다.  
Phase 1 Ask에서 실제 함수/SSOT 경로를 확정한다 (`trajectorySampleBuilder` · authoring derived · 관련 SSOT).

현재 합의된 재사용 계약:

### 5.1 CO–C1 구간

- 현재 정의된 **1/3 범위까지**
- **2Rg 단위** 파생
- 이유: 구름관성 차이가 동일하다고 보는 유효 구간

### 5.2 C3 이후

- 기존 정의대로 **2Rg 단위**
- Family 공통값 **완전히 동일**

### 5.3 Envelope Sampling과 혼동 금지

| Layer | Interval | Role |
|-------|----------|------|
| Family derived members | **2Rg** (authoring positions) | Family DB Member 생성 |
| Envelope `cueSet` | **1.5gr** · Cue→Impact **1/3** | Published Search sampling (Freeze / GLOSSARY) |

둘은 다른 계층이다. Family 구현이 Envelope Sampling Policy를 재해석하면 안 된다.

### 5.4 파생수정이 필요한 이유

향후 CO–C1 유효구간이 1/3보다 짧은 1/4, 1/5, 1/N으로 실제 데이터에서 발견될 수 있다.  
그때 **파생수정 = Branch Family** 모델이 필요하다 (명령 §7.2).

---

## 6. Search Index

Search Index는 **새로운 SSOT DB가 아니다.** Family DB의 검색용 파생 인덱스다.

최소 저장:

- `positionKey` 또는 balls coordinate search key
- `memberId`
- `familyId`
- `track`
- provenance / memberKind
- 검색에 필요한 최소 metadata

공통 SYS / AI / STR / HPT / 계산값은 **복제 저장하지 않는다**.

검색 절차:

1. balls 좌표로 Search Index에서 nearest/exact candidate
2. `memberId` / `familyId`로 Family Master resolve
3. track handedness에 따라 필요 시 thickness / HPT mirror
4. 정확히 일치하지 않으면 **기존 보간 규칙** 사용 (Real Interpolation 등 — 재구현 금지)
5. 동일 `PositionKey`에 서로 다른 Family 공략이 **최대 3개** 존재 가능

**PositionKey는 unique가 아니다.**  
한 position → 최대 3 strategy families.

---

## 7. Admin commands (CONFIRMED DESIGN · Phase 4)

| UI 버튼 | Internal command |
|---------|------------------|
| **원본수정** | `UPDATE` |
| **파생수정** | `BRANCH` + `REPLACE` |
| **새로저장** | `CREATE` |

구현은 Phase 4. 한 번에 전체 구현 금지.

### 7.1 원본수정 = UPDATE

현재 Family **Master 공통값만** 정정한다.

허용: SYS 공통 correction · AI · STR · HP/T · thickness · 기타 Master 공통값.

**금지: balls 좌표 변경.**

balls가 변경된 상태에서 원본수정:

> 공 위치가 변경되었습니다.  
> 기존 패밀리 수정에서는 공 위치를 변경할 수 없습니다.  
> 새로운 포지션을 생성하려면 '새로저장'을 사용하세요.

- Family ID 유지
- Members 유지
- Family Master만 UPDATE

### 7.2 파생수정 = BRANCH + REPLACE

기존 Family **내부 update가 아니다.**

기존 Family에서 **새로운 Branch Family** 생성.

주 목적: CO–C1에서 구름관성 차이로 타점/STR/AI 등 공통값이 달라지는 지점  
(예: 1/3 가정이 실제로는 1/5까지만 유효).

동작:

1. 현재 호출 Member를 branch point로 사용
2. 새 Family B 생성
3. `B.parentFamilyId = A.familyId`
4. `creationType = DERIVED_CORRECTION` (또는 동등)
5. `branchFromMemberId` 기록
6. 수정된 값을 B Master로 저장
7. B의 4 Track + 파생 Member 생성
8. B가 생성한 PositionKey와 충돌하는 **부모 Family A의 자동 Derived Member만** 제거

**절대 금지:**

- 다른 Family의 Member 제거
- AUTHORED member 자동 삭제
- parent 관계 없이 좌표만 같다는 이유로 삭제

삭제 최소 조건 (AND):

```text
candidate.familyId == newFamily.parentFamilyId
AND candidate.positionKey == newMember.positionKey
AND candidate.memberKind is auto-derived
```

- `parentFamilyId` = 계보 증명
- `PositionKey` = 같은 위치 증명
- `memberKind` = 자동 파생 증명

Family A 자체는 유지. B가 생성하지 않는 영역의 A Members는 유지.

예: A가 CO→1/3 담당, 1/5에서 B 생성 → 1/5 이전 A 유지, 1/5 이후 동일 PositionKey의 A 자동 derived만 제거.

### 7.3 새로저장 = CREATE

현재 화면을 template로 **완전히 독립된 새 Family**.

허용: balls · shotType · system · SYS · AI · STR · HP/T · thickness · 기타 자유 변경.

- `parentFamilyId = null`
- `creationType = AUTHORED`
- 기존 Family Member **삭제 없음**
- 기존 Family를 대체하지 않음
- 같은 position에 다른 공략 Family 가능 (최대 3 strategy slot)

---

## 8. Safety principles

1. Family Master가 공통값 SSOT
2. Member는 좌표 + track + identity/provenance 중심
3. mirrored HPT/thickness 중복 저장 금지
4. 원본도 Member에 포함
5. 4 Track은 동급 Member
6. Derived도 고유 데이터이지만 Master 공통값을 참조
7. Search Index는 SSOT가 아니라 derived index
8. 좌표 중복만으로 데이터 삭제 금지
9. 기존 Family 자동 Derived 제거 권한은 **파생수정 command에만** 부여
10. 새로저장은 기존 Family를 절대 삭제하지 않음
11. 원본수정은 공 좌표 변경 금지
12. 좌표가 같아도 다른 Family면 다른 공략일 수 있음
13. 같은 position에 최대 3개 공략 허용
14. 동일 Family 계보에서 새 branch가 더 구체적인 CO–C1 값을 가지면 부모의 충돌 auto-derived만 replace
15. 직접 작성 AUTHORED 데이터는 자동 삭제 금지

---

## 9. Implementation phases

각 Phase: **Ask → 사용자+ChatGPT 검토 → Agent**. 한 번에 전체 구현 금지.

### Phase 1 — Family Master + Member 저장 구조

- auto-generation **없음**
- 현재 저장 구조 분석 후 Master/Member 분리 설계
- **Must start as `[Cursor Mode: Ask]`**

확인할 것:

1. `PROJECT_MASTER_INDEX.md`
2. `HISTORY/PROJECT_LOG_2026-08.md`
3. 본 문서
4. 실제 저장: StrategyEntry / `positions_dataset` / History / Export / slot draft·applied
5. 기존 derived / symmetry SSOT · production code

코드 수정 금지 상태에서: 어떤 필드를 Master vs Member로 옮기는지 분석.

### Phase 2 — 4 Track auto-generation

- canonical 1개 → symmetry Member 3개
- mirror resolver
- 공통값 중복 저장 금지

### Phase 3 — Derived Members + Search Index

- CO–C1 기존 파생 규칙
- C3 이후 기존 파생 규칙
- 각 4 Track별 생성
- Search Index 생성
- 필요 시 3A / 3B 분리

### Phase 4 — Admin 3 Commands

- 원본수정 UPDATE
- 파생수정 BRANCH + REPLACE
- 새로저장 CREATE

---

## 10. Cite (do not duplicate)

| Topic | Authority |
|-------|-----------|
| Official terminology | `GLOSSARY_SSOT.md` (Family terms not yet adopted) |
| Envelope sampling 1/3 · 1.5gr | `Architecture/ENVELOPE_ARCHITECTURE_SSOT.md` Freeze |
| Dataset 3계층 · Export vs History | MASTER Dataset Architecture · LOG 2026-06 |
| SYS / C2 not a sys field | `4_CALCULATION_RULES.md` · C2 reflection policy |
| Display cap same-rail | `DISPLAY_BOUNDARY_POLICY_SSOT.md` · `trajectoryPathDisplayPolicy.ts` |
| Track symmetry H/V/RPI | `3_SYSTEM_ARCHITECTURE.md` · anchors JSON |
| Search interpolation | Phase 5 Mission 01 Real Interpolation (implemented) |

---

## 11. Next session first task

```text
[Cursor Mode: Ask]
Family Data Architecture Phase 1 — Family Master / Member 현재 저장 구조 분석
```

코드 / dataset / JSON / localStorage / 테스트 수정 금지.  
기존 uncommitted working tree 보존. Commit/Push는 사용자 요청 전까지 금지.
