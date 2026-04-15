PROJECT_LOG_2026-04.md (완성본)
# PROJECT LOG – 2026-04

Version: v1.0  
Created: 2026-04-XX  
Scope: Cushion Geometry · Rail Normal · Vector Placement 정립

---

# 📌 1. 세션 개요

2026-04 세션의 목적:

- 쿠션 기준 좌표계(FG)에서의 **법선(normal) 정의 통일**
- C3 ~ C6 벡터 마크의 **배치 규칙 정리**
- SystemGrid 렌더링 위치의 **시각적 불일치 해결**
- distance 기반 시각 튜닝 체계 확립 (BETA 도입)

이번 세션은:

**Geometry & Rendering Stabilization Phase**

---

# 🧱 2. 핵심 구조 변경

## 2.1 Rail 기반 Normal SSOT 도입

신규:


getRailOutwardUnitNormalFG(railLine)


### 정의 (FG 기준)

| Rail | Normal |
|------|--------|
| TOP | (0, +1) |
| BOTTOM | (0, -1) |
| LEFT | (-1, 0) |
| RIGHT | (+1, 0) |

### 특징

- 좌표(x,y) 기반 계산 제거
- railLine → normal 직접 매핑
- symmetry 적용 가능 구조 확보

---

## 2.2 computeNormalFromPosition 제거

기존:

- 좌표 기반 최근접 쿠션 탐색
- 방향 불안정 / 유지보수 어려움

변경:

- ❌ 완전 제거
- ✅ rail 기반 단일 normal 구조로 통합

---

## 2.3 Vector Mark Placement 파이프라인 확정

공통 구조:


railLine = getRailLineFromPosition(x, y)
normal = getRailOutwardUnitNormalFG(railLine)
targetFG = baseFG + normal * distance


### 의미

- 방향 = normal
- 위치 = baseFG + distance

👉 역할 분리 완성

---

# 🎯 3. Mark별 배치 정책 확정

## 3.1 C3

- baseFG: rail snap
- normal: outward + 수직 레일에서만 x 반전
- distance: CUSHION_HALF

👉 기존 레거시 유지

---

## 3.2 C4

- baseFG: rail snap
- normal: pure outward
- distance: CUSHION_HALF

### 변경 사항

기존:
- CUSHION_HALF + ALPHA

현재:
- CUSHION_HALF (C3와 동일)

👉 쿠션 중앙 기준 정렬 완료

---

## 3.3 C5 / C6

- baseFG: anchor (스냅 없음)
- normal: pure outward (반전 없음)
- distance: MID_RANGE + BETA

---

# 📐 4. 거리 체계 재정의

## 4.1 기본 상수 (FG)

| 항목 | 값 |
|------|----|
| CUSHION_RG | ≈ 1.266 |
| CUSHION_HALF | ≈ 0.63 |
| MID_RANGE | ≈ 0.95 |

---

## 4.2 문제

C5/C6가:

- 쿠션 쪽으로 붙어 보임
- “mid” 의미 불충분

---

## 4.3 해결: BETA 도입


distance = MID_RANGE + BETA


### 초기값


BETA = 1.0 (FG)


---

## 4.4 튜닝 결과

| BETA | 결과 |
|------|------|
| 0.5 | 부족 (쿠션 쪽) |
| 1.0 | ✅ 최적 |
| 1.5 | 과함 (프레임 쪽) |

---

## 4.5 설계 의도

- 프레임 ↔ 쿠션 사이 체감 mid + 약간 외향
- 모든 레일에서 동일 거리 이동
- normal 변경 없이 distance만으로 조정

---

# 🧠 5. FRAME (CO / C1) 정리

- railLine 기반 normal 사용
- applyLayerOffset는 outward 기준으로 재정의

👉 기존 시각 유지 + 내부 구조 개선

---

# ⚠ 6. 해결된 문제

### 6.1 C4 위치 불일치

- 상단/좌측 쿠션에서 서로 다른 위치
→ distance 통일로 해결

---

### 6.2 C5/C6 inward 문제

- 레일에 따라 방향 뒤집힘
→ pure outward로 해결

---

### 6.3 좌표 기반 normal 불안정

→ rail 기반으로 완전 해결

---

# 🔄 7. 설계 원칙 (확정)

1. normal은 반드시 railLine 기준
2. 좌표 기반 방향 계산 금지
3. 위치는 baseFG + distance로만 결정
4. distance는 시각 튜닝 레이어
5. symmetry 적용 가능한 구조 유지

---

# 📊 8. 현재 상태

| 항목 | 상태 |
|------|------|
| C3 | 안정 |
| C4 | 안정 |
| C5 | 안정 |
| C6 | 안정 |
| FRAME | 안정 |
| SystemGrid | 안정 |

---

# 🚀 9. 다음 단계

1. Symmetry (H / V / RPI) 완전 적용
2. rail enum 구조 도입 검토
3. distance 스케일링 자동화
4. vector label 정렬 최적화
5. geometry unit 테스트 추가

---

# 📌 10. 세션 평가

Before:

- normal 정의 혼재
- C4/C5/C6 방향 불일치
- 시각적 불안정

After:

- normal SSOT 확립
- C3~C6 정책 명확화
- distance 기반 튜닝 구조 확립
- 전체 렌더링 안정화

---

Status: Stable (2026-04 완료)

---

# 🔥 핵심 요약

- normal = rail 기준으로 완전 통일
- C4 = 쿠션 중앙
- C5/C6 = mid + BETA
- geometry 구조 = symmetry 대응 가능 상태

---

# 📎 부록: 2026-04-15 — 쿠션 마크 명명 `1C` → `C1` 마이그레이션 (프론트 도메인)

**브랜치:** `restore-from-v1-admin` (커밋은 로컬 PowerShell로 반영)

## 해결한 문제 (What we fixed)

1. **앵커·lookup·sysValues 키 체계 불일치**  
   숫자 접두(`"1C"` … `"6C"`)와 C-prefix(`C1` … `C6`)가 혼용되면서 `getAnchorCoordFromSys`, `sysValuesToAnchors`, UI 라벨 순서가 서로 어긋날 수 있던 상태를 정리함.

2. **lookup 단계의 alias 의존**  
   `anchorLookupEngine`에서 `"1C"` / JSON id `C1` 복수 허용 구조를 제거하고, `AnchorLookupMark`를 `C1` … `C6`로 단일화함.

3. **좌표 엔진·시스템 엔진·렌더 경로 정렬**  
   - `anchorCoordinateEngine`: 슬롯 키·`LABEL_SYS_CANDIDATES`를 `C1` 체계로 통일, 레거시 필드 후보(`oneC`, `threeC`, `"1C"` 등) 제거.  
   - `systemEngine.sysValuesToAnchors`: `C*_f` / `C*_r`만 사용, 앵커 키 `anchors["C1"]` 등으로 통일.  
   - `App.jsx`: `orderedKeys`, `LABEL_ORDER`, `allAnchors`, `anchors["C?"]`, `mark: "C1"` 등 렌더·궤적 계층을 C-prefix로 치환.  
   - `evaluateStrategy.ts`: `hasC1`에서 레거시 `oneC` 검사 제거 → `C1_f` / `C1_r`만으로 “C1 확정 여부” 판단 (불필요한 formula 보조 실행 감소).

4. **부가 파일**  
   `trajectorySampleBuilder.ts` 주석 정리, `evaluateStrategy` 외 변경은 동일 마이그레이션 맥락.

## 아직 하지 않은 것 / 다음 단계 (Next Step)

| 항목 | 설명 |
|------|------|
| **저장소 동기화** | 로컬에서 커밋만 한 경우, `git push origin restore-from-v1-admin` 및 PR·`main` 병합 여부 확인. |
| **엔진·규칙 JSON·샘플 데이터** | 이번 작업 범위에서 `rules.json`·샘플 JSON은 건드리지 않음. expr·저장 포맷에 옛 키가 남아 있으면 별도 마이그레이션 또는 호환 검증 필요. |
| **`hasC1` vs `sysInputs.C1`** | 현재 `hasC1`은 `C1_f` / `C1_r`만 본다. **통합 필드 `C1`만** 채우는 입력 경로가 있으면 formula가 다시 돌 수 있음 → 데이터 소스별로 한 번 확인 권장. |
| **회귀 테스트** | 실제 샷/시스템별로 궤적·라벨·수치 표시 스모크 테스트 (문서상 자동 테스트 추가는 §9 항목과 별개). |
| **기하·normal 작업본문(§1–§10)** | 위 부록은 **명명/키 마이그레이션** 기록. §9의 symmetry·rail enum·unit test 등은 여전히 후속 과제로 남음. |

---

**Status (2026-04-15 supplement):** 프론트 도메인 쿠션 마크 C-prefix 전환 및 `oneC` 제거까지 반영. 규칙 파일·원격 브랜치·전체 회귀는 다음 단계.