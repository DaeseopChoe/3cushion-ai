# 🔍 구조 확인 보고서 (1단계 – 수정 금지)

> 검색 대상: 시스템 값→좌표 변환, anchors 기반 계산, derivations 호출, trajectory 엔진

---

## 1️⃣ 시스템 값 → 좌표 변환 로직 위치

| 위치 | 파일 | 함수/역할 |
|------|------|-----------|
| **메인 좌표 변환** | `frontend/src/App.jsx` | `convertCanonicalAnchors` (FG↔Rg), `groupSystemValuesByRail(anchors, systemValues, lastCushion)` |
| **좌표 변환 유틸** | `frontend/src/lib/convertCanonicalAnchors.js` | `convertCanonicalAnchors(anchors, canonical)` — FG/Rg 좌표 변환 |
| **레일 교점 계산** | `frontend/src/App.jsx` L2883~2916 | CO–1C 선과 레일 날선 교점 계산 (CO_rail, C1_rail) |
| **관리자 SYS** | `frontend/admin/sys/SysOverlay.tsx` | anchors_input을 SystemCalcInputV1으로 전달 |

---

## 2️⃣ anchors 기반 좌표 계산 로직

| 위치 | 파일 | 함수/역할 |
|------|------|-----------|
| **앵커 기반 그룹핑** | `frontend/src/App.jsx` L371~393 | `groupSystemValuesByRail(anchors, systemValues, lastCushion)` — mark별 coord + sys 매칭 |
| **앵커 → 시스템값 매핑** | `frontend/src/App.jsx` L2966 | `railGroups = groupSystemValuesByRail(anchors, system.values, view.last_cushion)` |
| **앵커 표시** | `frontend/src/App.jsx` L2978 | `AnchorPoint` — `systemValues[label]`로 앵커별 sys 값 표시 |
| **시스템별 앵커 JSON** | `frontend/src/systems/*/anchors.json` | B2T_L, B2T_R, T2B_L, T2B_R 트랙별 anchors 정의 |

---

## 3️⃣ derivations/*.rules.json을 실제로 호출하는 코드

| 검색 결과 | 결론 |
|-----------|------|
| `*.ts`, `*.tsx`, `*.js`, `*.jsx` 전체 검색 | **호출하는 코드 없음** |

- `derivations/*.rules.json`은 `logic.json`, `profile.json`에서 **참조만** 존재 (문서/규칙 설명용)
- 실제 계산은 `data/system/calculator/`의 하드코딩 계산기에서 수행
- `data/derivations/` 아래 rules.json 36개 존재하나 **런타임 로드/실행 없음**

---

## 4️⃣ trajectory builder / calculator 엔진 진입점

| 구분 | 파일 | 함수/역할 |
|------|------|-----------|
| **Trajectory 샘플 빌더** | `frontend/src/utils/trajectorySampleBuilder.ts` | `buildTrajectorySample()`, `pointsToAnchors()` — trajectory_samples 생성 |
| **메인 시스템 계산 엔진** | `data/system/calculator/calculateSystemV1.ts` | `calculateSystemV1(input)` — 단일 진입점 |
| **레지스트리** | `data/system/calculator/registry.ts` | `getSystemCalculator()`, `getSystemProfile()` |
| **등록 계산기** | `data/system/calculator/systems/five_and_half.ts` | `FiveAndHalfCalculator.calculate()` — CO_sys, C1_sys, C3_sys, arrival_sys |
| **공식 수식 계산** | `frontend/src/utils/systemCalculator.ts` | `calculateByProfileExpr(expr, inputs)` — `+` 합산만 지원 |
| **Admin SYS 훅** | `frontend/admin/sys/useSysCalculation.ts` | `useSysCalculation(systemId, input)` — fallback evaluator, `profile.formula.expr` 기반 |

---

## 5️⃣ admin/sys/useSysCalculation.ts ↔ 메인 엔진 연결 여부

| 항목 | 현재 상태 |
|------|-----------|
| **useSysCalculation** | `OTIP_PLUS_PROFILE`만 등록, `fallbackCalculateByProfileExpr` 사용 |
| **calculateSystemV1** | `FiveAndHalfCalculator` 사용, anchors_input → values 계산 |
| **연결** | **연결 없음** — 서로 독립 동작 |

- `useSysCalculation`: `profile.formula.expr` 파싱 후 순수 수식 계산 (LHS = RHS 평가)
- `calculateSystemV1`: anchors 기반 좌표→시스템값 변환 + 보정 로직
- `SysOverlay`는 `useSysCalculation(sysCalcInput)` 호출하나, 실제 `useSysCalculation` 시그니처는 `(systemId, input: Values)`로 **API 불일치** 가능성 있음

---

## 6️⃣ 정리

1. **공식 계산**: `useSysCalculation` (formula.expr 기반) — 순수 숫자 계산
2. **좌표 계산**: `App.jsx` + `convertCanonicalAnchors` + `groupSystemValuesByRail` + `calculateSystemV1` (anchors_input 기반)
3. **derivations/rules.json**: 런타임 호출 없음, 문서/규칙 참조용
4. **admin SYS**: 현재 표시 전용 수식 계산기로 동작, 메인 엔진과 미연결
