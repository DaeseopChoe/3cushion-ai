# Position Recall & SAVE 구조 재설계

**작성일:** 2026-03  
**최종 반영:** 2026-03-19  
**목적:** Import → Position Recall 재정의, SAVE 3단계 구조 설계

> **구현 상태:** 설계 문서 → 실제 구현 반영 완료. 아래 "구현 반영" 섹션 참고.

---

## 🔥 반드시 수정해야 할 5가지 (핵심)

| # | 문제 | 해결 |
|---|------|------|
| **1** | 6D + Weighted 이중 거리 → nearest 뒤집힘 | A) KD-Tree도 Weighted로 통일 (추천) 또는 B) **최종 기준은 Weighted** 명시 |
| **2** | setBallsState + loadDraft 분리 → 비동기 충돌 | **단일 트랜잭션** (batch/dispatch) 필수 |
| **3** | AUTO SAVE 폭주 | **3단계 방어:** debounce + deepEqual + change flag |
| **4** | Recall 자동 적용 → 잘못된 매칭 적용 | **추천 + 확인 후 적용**. threshold/softThreshold 검증 레이어 |
| **5** | EXPORT 시점 데이터 소스 애매 | **반드시 현재 UI 상태(live state)** 기준. snapshot/localStorage 아님 |

---

## Part 1. Position Recall (기존 Import 재정의)

### 1.1 기능 정의

| 기존 | 변경 |
|------|------|
| **Import** | ~~JSON 파일 선택 → dataset 덮어쓰기~~ → **완전 제거** |
| **Position Recall** | 현재 3볼 좌표 기준 dataset에서 가장 유사한 record 검색 → UI state에 적용 |

**핵심:** 파일 선택 없음. 현재 화면의 cue/target/second 좌표로 dataset 내 nearest search 후 해당 record의 balls + strategy를 UI에 복원.

**구현 반영:** Import 버튼 제거. Recall 버튼으로 대체. `runPositionRecall` (positionRecallEngine) 사용.

---

### 1.2 positions_dataset 기반 유사도 계산 로직

```
입력: currentBalls (Ball3), dataset (PositionRecord[])
출력: PositionRecord | null (가장 유사한 1개)

1. currentBalls를 6D 포인트로 변환: [cue.x, cue.y, target.x, target.y, second.x, second.y]
2. dataset 각 record의 balls와 6D 거리 계산
3. 거리 최소인 record 선택
4. (선택) 거리 임계치 초과 시 null 반환
```

**재사용:** 기존 `ballsToPoint6D`, `dist2_6d` (kdTree6d.ts), `PositionKDIndex.searchTop1` 활용.

---

### 1.3 3볼 좌표 거리 계산 방식

| 방식 | 수식 | 용도 |
|------|------|------|
| **6D Euclidean** | `dist2_6d(a, b) = Σ(a[i]-b[i])²` | KD-Tree nearest search (coarse) |
| **Weighted 6D** | `CUE_W·Δcue² + TARGET_W·Δtarget² + SECOND_W·Δsecond²` | **최종 결정 기준** |

**가중치:** CUE_W=2.0, TARGET_W=1.5, SECOND_W=1.0

---

#### ⚠️ [핵심] 이중 거리 시스템 해결

**문제:** KD-Tree(6D)와 Weighted가 서로 다른 공간 → nearest가 뒤집힐 수 있음.

**해결 (택 1):**

| 선택지 | 내용 |
|--------|------|
| **A. 통일 (추천)** | KD-Tree도 Weighted distance 사용. `distance = 2.0·Δcue² + 1.5·Δtarget² + 1.0·Δsecond²` |
| **B. 유지 (차선)** | KD-Tree는 **coarse filtering용**. **최종 결정은 반드시 Weighted distance 기준**으로 고정. 문서에 명시 필수. |

**결론:** 구조 유지 시에도 **"최종 기준은 Weighted"** 명확히 고정.

---

### 1.4 가장 가까운 record 선택 알고리즘

```
positionRecall(dataset, currentBalls, options?):
  1. signature filter (optional): 현재 시스템/시그니처와 일치하는 record만
  2. KD-Tree nearest search (PositionKDIndex.searchTop1) — coarse
  3. Weighted Distance로 Top1 최종 결정
  4. ⚠️ distance > threshold → "no match" 반환 (잘못된 데이터 로드 방지)
  5. 동점 시: slot별 StrategyEntry 존재 여부로 우선순위
  6. 반환: { position, strategy, score } | null
```

**StrategyEntry 선택:** position.strategies 중 activeSlot과 일치하는 entry. 없으면 첫 번째.

---

#### ⚠️ [핵심] Recall = "추천 + 확인 후 적용" (자동 적용 금지)

**문제:** 잘못된 매칭도 그냥 적용 → 잘못된 데이터 저장 → dataset 품질 오염.

**해결:** 반드시 적용 전 검증 레이어 추가.

```ts
// 1단계: hard threshold — 매칭 실패
if (distance > HARD_THRESHOLD) {
  showWarning("유사한 포지션 없음");
  return;
}

// 2단계: soft threshold — 유사도 낮음, 확인 후 적용
if (distance > SOFT_THRESHOLD) {
  const ok = confirm("유사도가 낮습니다. 적용하시겠습니까?");
  if (!ok) return;
}

// 3단계: 확인 후 적용
applyPositionRecall(record);
```

**결론:** Recall = 자동 적용 ❌ / Recall = "추천 + 확인 후 적용" ⭕

---

### 1.5 선택된 record를 UI state에 적용하는 구조

#### ⚠️ [핵심] 단일 트랜잭션 필수

**문제:** `setBallsState` + `loadDraftFromStrategyEntry` 분리 시 비동기 충돌 가능.

**해결:** 반드시 하나의 액션으로 묶어야 함.

```ts
// 권장: 단일 dispatch
applyPositionRecall(record) {
  batch(() => {
    setBallsState(normalizeBalls(record.balls));  // round1 적용
    setAdminState(prev => ({ ...prev, balls: record.balls }));
    loadDraftFromStrategyEntry(activeSlot, entry);
  });
}

// 또는 reducer 패턴
dispatch({ type: "APPLY_POSITION_RECALL", payload: record });
```

**round1 적용:** Recall 후 balls 좌표에도 `round1` 적용. `normalizeBalls(record.balls)` 내부에서 처리.

**target_center 정규화:** record.balls.target → ballsState.target_center 매핑 필요.

---

### 1.6 성능 고려 (dataset 커질 경우)

| dataset 크기 | 전략 |
|--------------|------|
| **< 1000** | brute force (선형 스캔) 가능 |
| **1000 ~ 5000** | KD-Tree 필수 |
| **> 5000** | KD-Tree + spatial coarse filter (±3 grid) |

**구현:**
- dataset 변경 시 `kdIndexRef.current.rebuild(dataset)`
- Position Recall: `kdIndex.searchTop1(signatureKey, currentBalls)` 또는 `searchTop1AllSignatures`
- **Coarse Filter:** ±3 grid 이내만 후보 (5000+ 시)

---

## Part 2. SAVE 3단계 재설계

### 2.1 구조 개요

| 단계 | 트리거 | 저장 대상 | 저장소 | 용도 |
|------|--------|-----------|--------|------|
| **AUTO SAVE** | ~~dataset/anchorsOverride 변경 시~~ | — | — | **변경:** 항상 ON, **적용 버튼 클릭 시만** 저장 |
| **SAVE** | SAVE 버튼 / overlay 적용 | workspace snapshot | localStorage `workspace_history` | 특정 시점 스냅샷, 되돌리기 가능 |
| **EXPORT** | History → Unexported → Export | 선택 snapshot JSON | File System (systemId/pattern 폴더) | 선택 스냅샷 파일 저장 |

**구현 반영:** AUTO SAVE 버튼 제거. 적용 시 handleSaveWorkspaceSnapshot 호출. Export는 History 모달 내부에서만 수행.

---

### 2.2 AUTO SAVE

#### ⚠️ [핵심] 3단계 방어 필수

**문제:** Recall/anchor edit 시 대량 상태 변경 → localStorage write 폭주.

**해결:** 3단계 방어 조합

```
1. debounce (500~800ms)
2. deepEqual 비교 — prevState와 nextState 동일하면 skip
3. change flag — 실제 변경 발생 시에만 저장
```

```ts
// 예시
const prevRef = useRef(null);
useEffect(() => {
  const next = { dataset, anchorsOverride };
  if (isEqual(prevRef.current, next)) return;
  prevRef.current = next;
  debouncedSave(next);
}, [dataset, anchorsOverride]);
```

| 항목 | 내용 |
|------|------|
| **트리거** | dataset 또는 anchorsOverride 변경 (debounce 500~800ms) |
| **저장 형식** | `{ dataset, anchorsOverride, saved_at }` |
| **localStorage key** | `WORKSPACE_AUTO_V1` |
| **동작** | overwrite. deepEqual 시 skip. |

---

### 2.3 SAVE (Workspace Snapshot + 히스토리) — 구현 확정

| 항목 | 내용 |
|------|------|
| **트리거** | SAVE 버튼 클릭 / overlay 적용 버튼 클릭 |
| **저장 형식** | `WorkspaceSnapshot` (metadata + state) |
| **localStorage key** | `workspace_history` |
| **동작** | 현재 상태를 히스토리 스택에 push. |

**히스토리 구조 (구현):**
```ts
type WorkspaceSnapshot = {
  id: string;              // uuid
  name: string;            // pattern_systemId_vNNN_date
  systemId: string;
  pattern: string;
  version: number;
  timestamp: string;
  exported?: boolean;      // Export 완료 시 true
  state: AppState;         // adminState, ballsState, dataset, shotEditor
};
```

**All / Unexported 탭:** exported=false만 Unexported에 표시. Export 후 All에만 남음.

---

### 2.4 EXPORT — 구현 확정

**위치:** History 모달 → Unexported 탭에서만 수행 (외부 Export 버튼 제거)

| 항목 | 내용 |
|------|------|
| **트리거** | Unexported 탭에서 스냅샷 선택 → Export 버튼 클릭 |
| **저장 형식** | 선택 snapshot 전체 (JSON) |
| **출력** | File System Access API — `{systemId}/{pattern}/{systemId}_{pattern}_v{version}_{date}.json` |
| **version** | patternDir 내 기존 파일 파싱 후 max+1 (overwrite 금지) |
| **동작** | saveSnapshotToFile → exported=true 반영 |

**maxDist2 제거 반영:** positionRecallEngine에서 distance cut-off 제거. threshold 기반 판단만 사용.

---

## Part 2.5 추가 보강 (중요도 중간)

| 항목 | 내용 |
|------|------|
| **TopK fallback** | `distance > RECALL_THRESHOLD` → `null` 반환. 잘못된 데이터 로드 방지. |
| **dataset 크기** | <1000 brute force, 1000~5000 KD-tree, 5000+ KD-tree + coarse filter |
| **round1 연결** | `applyPositionRecall` 시 balls 좌표에도 round1 적용 |
| **snapshot metadata** | `id`, `timestamp`, `systemId`, `note` — 되돌리기 UX 필수 |

---

## Part 2.6 dataset mutation 보호 (강력 추천)

**문제:** Recall → 수정 → SAVE 시 dataset 오염 가능.

**해결:** Recall 후에는 dataset 직접 쓰기 금지. **수동 저장만 dataset 반영.**

```ts
// 옵션 A: mode flag
if (mode === "recall") {
  datasetWriteDisabled = true;  // SAVE 버튼 비활성화 또는 "수동 저장만 적용"
}

// 옵션 B: "수동 저장만 dataset 반영"
// Recall로 로드된 데이터는 SAVE 클릭 시에만 dataset에 반영됨
```

---

## Part 4. 최종 구조 상태

```
[관리자]

3볼 설정
  → Recall (추천)
  → 확인 후 적용 (threshold/softThreshold 검증)
  → 수정
  → AUTO SAVE (백업)
  → SAVE (snapshot)
  → EXPORT (배포 JSON, 현재 UI 상태 기준)

↓

[사용자]

Published JSON 로드
  → 계산만 수행
```

---

## Part 3. 수정 대상 파일 및 구조

### 3.1 Import → Position Recall 변경

| 파일 | 변경 목적 | 변경 내용 |
|------|------------|-----------|
| **App.jsx** | Import 버튼 → Position Recall 버튼 | `handleImportDataset` → `handlePositionRecall`. 파일 input 제거. |
| **App.jsx** | Recall 핸들러 | 검색 → threshold 검증 → (softThreshold 시 confirm) → 확인 후 적용. **자동 적용 금지** |
| **admin/slotAutoRecommend.ts** | Recall용 함수 분리 | `runPositionRecall(params)`: signature 무관 또는 optional. balls + strategy 적용 콜백 |
| **domain/search/positionKDIndex.ts** | signature 무관 검색 | `searchTop1AllSignatures(balls)` 추가 (전체 dataset에서 nearest) |
| **hooks/useShotSlots.ts** | Recall 시 balls 적용 | `loadPositionRecall(record)` 또는 `applyBallsAndStrategy(record)` 추가 |

**신규 모듈 (선택):**
- `domain/positionRecallEngine.ts`: `findNearestPosition`, `applyRecordToUI` — 검색 + 적용 로직 캡슐화

---

### 3.2 SAVE 3단계 구조

| 파일 | 변경 목적 | 변경 내용 |
|------|------------|-----------|
| **App.jsx** | AUTO SAVE | useEffect: dataset/anchorsOverride 변경 시 debounce → localStorage |
| **App.jsx** | SAVE 버튼 | `handleSave` → workspace snapshot push (히스토리) |
| **App.jsx** | Export 버튼 | `handleExport` → **현재 UI 상태** 기준 `buildFromCurrentState` → published JSON |
| **domain/persistenceEngine.ts** (신규) | 저장 로직 분리 | `saveWorkspaceAuto`, `saveWorkspaceSnapshot`, `buildFromCurrentState`, `createPublishedPayload` |
| **domain/fileService.ts** | Export 헬퍼 | `downloadPublishedJSON(payload, filename)` |
| **hooks/useWorkspaceHistory.ts** (신규, 선택) | 히스토리 상태 | snapshots, push, restore |

---

### 3.3 데이터 구조 변경

| 기존 | 변경 |
|------|------|
| `positions_dataset` | `WORKSPACE_AUTO_V1.dataset` 또는 유지 (마이그레이션) |
| `ANCHORS_OVERRIDE_V1` | `WORKSPACE_AUTO_V1.anchorsOverride` 또는 유지 |
| (없음) | `WORKSPACE_HISTORY_V1`: WorkspaceSnapshot[] |
| Export 형식 | `PublishedPayload` (anchors merged) |

---

### 3.4 UI 변경 — 구현 반영

| 버튼 | 기존 | 변경 |
|------|------|------|
| **Import** | 파일 선택 → dataset 덮어쓰기 | **제거** → Recall로 대체 |
| **SAVE** | handleSaveStrategy (dataset upsert) | workspace snapshot (히스토리 push) |
| **Export** | 외부 버튼 | **History 모달 Unexported 탭 내부**로 이동 |
| **파일 연결** | initFileHandle | **제거** |
| **Admin / Auto Save / Save Strategy** | — | **제거** |

**현재 우측 버튼:** Grid, Recall, History, SAVE

---

### 3.5 파일별 수정 요약

| 파일 | 변경 목적 | 변경 함수/추가 | 구조 변경 |
|------|------------|---------------|-----------|
| **App.jsx** | Recall, AUTO SAVE, SAVE, Export | handlePositionRecall, useEffect AUTO SAVE, handleSave, handleExport | 중 |
| **admin/slotAutoRecommend.ts** | Recall 로직 | runPositionRecall (또는 positionRecallEngine으로 이전) | 소 |
| **domain/search/positionKDIndex.ts** | 전체 검색 | searchTop1AllSignatures | 소 |
| **domain/persistenceEngine.ts** | 신규 | saveWorkspaceAuto, saveWorkspaceSnapshot, createPublishedPayload | 신규 |
| **hooks/useShotSlots.ts** | Recall 적용 | applyBallsFromRecord 또는 loadPositionRecall | 소 |
| **hooks/useWorkspaceHistory.ts** | 신규 (선택) | snapshots, push, restore | 신규 |
| **domain/fileService.ts** | Export | downloadPublishedJSON | 소 |

---

### 3.6 PROJECT_MASTER_STATE_CURRENT 전면 재작성

**권고: 필요**

- 저장 포맷 변경 (workspace, history, published)
- Import → Position Recall 기능 재정의
- localStorage 키/구조 변경

---

*최종 업데이트: 2026-03-19 (구현 반영)*
