# 3Cushion AI — 새 창 이관문서 (Admin 모달 입력 → USER 화면 표시)

> **용도**: Cursor **새 채팅**에 첫 메시지로 붙여넣기 또는 `@`로 참조  
> **전제**: Admin UX Phase 1 **커밋·푸시 완료** (`PROJECT_LOG_2026-05.md` **§23**)  
> **이전 창 주제**: Admin Search/Reset · 입력 세션 · targetBall SSOT — **본 문서 범위 아님**  
> **상세 로그**: `작업관리/HISTORY/PROJECT_LOG_2026-05.md` **§22 (USER)**, **§23 (Admin)**

---

## 1. 이번 작업 한 줄 정의

**관리자(ADMIN)가 SYS / HP·T / STR / AI 모달에 입력·저장한 내용**을, **사용자(USER) 화면에서 필요한 형태로 정리(read-only)** 하여 표시한다.

- ADMIN: **입력·편집·SAVE** (기존 유지)
- USER: **조회·코칭 표시** (이번 작업 범위)

---

## 2. 프로젝트·진입 구조

| 항목 | 내용 |
|------|------|
| Repo | `D:/3Cushion AI` |
| Frontend | `frontend/src` |
| 실행 트리 | `main.jsx` → `RootWrapper` → **`<Stage>`** (rail SSOT) |
| 테이블 앱 | `Stage.jsx` 내부 `<App />` (rail + table) |
| 주의 | `main.jsx`의 `<Stage><App /></Stage>` 자식 `<App>`은 **dead** — 실제 App은 Stage 내부만 |

---

## 3. 완료된 선행 작업 (건드리지 말 것)

### 3.1 Admin UX Phase 1 (§23) — STABLE

- Target/Position 버튼 제거 → **타겟 더블클릭** → **Search** → 입력 세션
- Search 성공/실패 모두 `beginAdminInputSession()` → SYS/HP/T/STR/AI/SAVE 활성
- Reset: 레이어 제거, **볼·target 유지**
- `adminTargetColorRef` / `getAdminSearchTargetBall()` — Recall·UI target 동기화

### 3.2 USER rail / Search (§22) — 부분 완료

- USER Search → `runPositionRecall` → `applyPositionRecall` (draft)
- White screen 복구: `userRailActions` 패턴
- **미완료(별도 STEP)**: Search 후 `hydrateSlotRuntime` 호출 갭 — `HANDOFF_USER_PHASE2_2026-05.md` §4 참고

---

## 4. 데이터 흐름 (Admin 입력 → USER 표시)

```text
[ADMIN] 모달 입력
  SYS  → App.jsx 내부 SysOverlay onSave → adminState.sys + slot draft/applied.sys
  HP/T → overlay HPT → adminState.hpt + slot draft/applied.hpt
  STR  → overlay STR → adminState.str + slot draft/applied.str
  AI   → overlay AI  → adminState.ai  + slot draft/applied.ai
        ↓
  SAVE → handleCanonicalRightPanelSave → handleSaveStrategy
        ↓
  localStorage["positions_dataset"]  (PositionRecord, strategies S1/S2/S3)

[USER] 조회
  Search → applyPositionRecall(record) → slot draft (sys/hpt/str/ai)
  공략 S1|S2|S3 클릭 → setUserTableDisplaySlotId + hydrateSlotRuntime
        ↓
  buildUserInfoPanel(...) → UserInfoPanelModel
        ↓
  UserAiPanel (AI 모달) / HP·T 모달 (일부 필드만)
```

| ADMIN 모달 | 저장 위치 (canonical) | USER 표시 후보 |
|------------|----------------------|----------------|
| SYS | `slot.draft/applied.sys`, `record.strategies[slot].signature` + outputs | `userInfoPanel.systemValues`, `summaryText`, trajectory 숫자 |
| HP/T | `hpt` (T, hit_point, mode) | `userInfoPanel.hpPreview`, USER HP/T 모달 |
| STR | `str` (curve, speed, depth, impact, spin…) | `buildPlayStrategySummaryText` / `trajectorySummary` |
| AI | `ai.text`, `ai.onePointLessons` | `caution`, `onePointLesson` |

**SSOT 원칙 (권장)**

- USER 표시용 **가공·문장 조립** → `domain/userInfoPanelModel.ts` (`buildUserInfoPanel`, pure)
- USER **UI 렌더** → `components/user/UserAiPanel.jsx`, `App.jsx` USER `ModalShell`
- **slot/render/hydrate 코어**는 읽기만; 본문 수정은 별도 승인 없이 금지 (§7)

---

## 5. 현재 USER 표시 구현 상태

### 5.1 이미 있는 것

| 구성요소 | 파일 | 상태 |
|----------|------|------|
| Read model | `domain/userInfoPanelModel.ts` | `UserInfoPanelModel`, `buildUserInfoPanel`, `buildPlayStrategySummaryText` |
| AI 패널 UI | `components/user/UserAiPanel.jsx` | title, summary, systemValues, trajectory, caution, onePoint |
| App 연동 | `App.jsx` ~5776 `userInfoPanel` useMemo | `userTableDisplaySlotId` + slot draft/applied → `buildUserInfoPanel` |
| Stage 전달 | `onUserInfoPanelChange` | Stage가 model 수신 가능 (rail/외부 연동 확인) |
| USER AI 모달 | `App.jsx` ~8034 | `overlayContent === "AI"` → `<UserAiPanel model={userInfoPanel} />` |
| USER HP/T 모달 | 동일 ModalShell | `opts.hitpoint_clock`, `thicknessForCalc`, `opts.english_tips` — **테이블 view 옵션 쪽**, slot hpt와 완전 일치 여부 검증 필요 |

### 5.2 갭 / 알려진 이슈 (이번 작업 후보)

1. **모달 커버리지** — USER에 SYS/STR 전용 read-only 모달 없음 (AI·HP/T만 부분 구현).
2. **표시 게이트** — `userInfoPanel`은 `userTableDisplaySlotId` + `hasSlotSys` 있을 때만 생성; Search 직후 공략 미선택이면 AI 패널 빈 메시지.
3. **useMemo deps** — `userInfoPanel` 의존 배열에 `userTableDisplaySlotId` 누락 가능성 → 공략 전환 시 stale model 검증.
4. **ADMIN vs USER 필드 매핑** — Admin `SysOverlay` 저장 필드명과 `buildUserInfoPanel` 입력 키(CO_f, oneC 등) 정합성 점검 필요.
5. **이중 SysOverlay** — 메인 ADMIN SYS는 **`App.jsx` 내부 `function SysOverlay`**; `admin/sys/SysOverlay.tsx`는 **미사용** (§5.3 PROJECT_LOG).
6. **STEP 2-3 (병행 가능)** — Search 후 hydrate 미호출 → trajectory/기준값/표시 숫자 불일치 — `HANDOFF_USER_PHASE2_2026-05.md` §4.

---

## 6. 권장 작업 단계 (Phase 제안)

### Phase A — 요구사항·필드 매핑표

- ADMIN 모달 필드 ↔ `PositionRecord` / slot draft ↔ `UserInfoPanelModel` 필드 1:1 표 작성
- USER rail 버튼별 노출 정책 확정 (AI만 vs HP/T/SYS/STR 분리 vs 통합 패널)

### Phase B — `userInfoPanelModel` 확장

- 누락 필드(STR 상세, SYS shotType, corrections 요약 등) read model에 추가
- 단위 테스트: `domain/userInfoPanelModel.test.ts` 확장

### Phase C — USER UI 정리

- `UserAiPanel` 또는 신규 `UserSysPanel` / `UserStrPanel` 등 **read-only** 컴포넌트
- `App.jsx` USER `ModalShell` — `overlayContent` 타입·title·본문 통일
- Admin 문장 톤과 동일하게 보이도록 `buildPlayStrategySummaryText` 재사용 (이미 Admin AiOverlay와 mirror)

### Phase D — 연동·게이트

- 공략 선택 / Search 성공 시 `userInfoPanel` 갱신 보장
- (선택) STEP 2-3: `handleUserSearchStrategies` 성공 후 `hydrateSlotRuntime(activeSlot)` **호출만** 추가

### Phase E — 검증

- ADMIN SAVE → USER 동일 position Search → 각 모달·테이블·AI 패널 내용 일치
- `npm run build`, `userInfoPanelModel.test.ts`

---

## 7. 절대 수정 금지 (이번 작업에서도)

| 영역 | 이유 |
|------|------|
| `runAdminPositionRecall`, `adminStrict`, `runSpatialRecall` 알고리즘 | §23 정책 |
| `hydrateSlotRuntime`, `syncSlotRuntimeAdminAndTrajectory`, `slotRenderSys` **함수 본문** | hydrate SSOT |
| `applyPositionRecall` / SAVE schema / `handleSaveStrategy` persist 규칙 | canonical boundary §9 |
| Trajectory / anchor / recall engine 수학 | §3, §8 |
| Admin Search/Reset 상태머신 (`beginAdminInputSession` 등) | §23 완료 |
| Stage rail 레이아웃 상수·white screen 패턴 파괴 | §22 |

**허용 예시**

- `userInfoPanelModel.ts`, `UserAiPanel.jsx`, USER `ModalShell` 블록
- `App.jsx`의 `userInfoPanel` useMemo 인자·deps, `overlayContent` 분기
- `handleUserSearchStrategies` 끝에 `hydrateSlotRuntime` **한 줄 호출** (본문 수정 없이)

---

## 8. 주요 파일·심볼 인덱스

| 파일 | 심볼/영역 |
|------|-----------|
| `App.jsx` | ADMIN `overlayState` + ModalShell ~7781; USER ModalShell ~8034; `userInfoPanel` ~5776; `pickStrategySlot` ~5471 |
| `domain/userInfoPanelModel.ts` | `buildUserInfoPanel`, `UserInfoPanelModel` |
| `components/user/UserAiPanel.jsx` | read-only AI 코칭 UI |
| `hooks/useShotSlots.ts` | `applyPositionRecall`, `buildDraftsFromRecord` (record → draft) |
| `domain/slotRuntimeHydrate.ts` | `buildSlotRuntimePayload`, `extractSlotTargetBall` |
| `domain/strategyButtonModel.ts` | USER rail 라벨 |
| `components/Stage.jsx` | USER_FUNC_BUTTONS, `onUserInfoPanelChange` |
| `admin/sys/SysOverlay.tsx` | **메인 미사용** — 참고용만 |

---

## 9. 검증 체크리스트

1. ADMIN: 타겟 더블클릭 → Search → SYS/HP/T/STR/AI 입력 → SAVE
2. USER: 동일 볼 배치·target → Search → S1/S2/S3 선택
3. USER **AI** 모달: title, summary, systemValues, onePoint, caution이 ADMIN 입력과 일치
4. USER **HP/T** 모달: 두께·타점·회전이 slot `hpt` 기준과 일치 (view opts 혼선 없음)
5. (범위에 포함 시) USER **SYS/STR** read-only 모달 또는 AI 패널 내 통합 표시
6. 기준값 ON 시 `SystemValueLabels` 숫자 (STEP 2-3 연동 시)
7. ADMIN Search/Reset·SAVE 회귀 없음
8. `npm run build` 성공

---

## 10. 운영 규칙

1. **요청 범위 외 수정 금지** — import 정리, 전역 refactor, Admin UX 재개편 금지
2. **표시 레이어 = pure model + dumb UI** — mutation은 ADMIN만
3. **새 ref/register** 추가 시 mount/cleanup 검증 (§22 white screen 이력)
4. Cursor 요청 시 **파일·금지 목록·Phase** 명시
5. 작업 완료 후 `PROJECT_LOG_2026-05.md`에 **§24** append 제안

---

## 11. 새 창용 시작 프롬프트 (복사용)

```text
[MODE] EXECUTE — Admin 모달 입력 → USER read-only 표시 정리

컨텍스트:
@작업관리/HISTORY/HANDOFF_ADMIN_MODAL_TO_USER_DISPLAY_2026-05.md
@작업관리/HISTORY/PROJECT_LOG_2026-05.md §22, §23
(선택) @작업관리/HISTORY/HANDOFF_USER_PHASE2_2026-05.md §4 — Search 후 hydrate 갭

전제: Admin Phase 1 커밋·푸시 완료. Recall/Admin Search 상태머신 변경 금지.

목표:
1) ADMIN SYS/HP/T/STR/AI 입력 필드 → USER 표시 필드 매핑표 정리
2) domain/userInfoPanelModel.ts + UserAiPanel(및 필요 시 USER 모달)로 read-only 표시 완성
3) USER AI·HP/T(·SYS·STR) 모달이 slot draft/applied SSOT와 일치하는지 검증·수정
4) 공략 선택(userTableDisplaySlotId) / Search 후 userInfoPanel 갱신 보장

절대 수정 금지:
runAdminPositionRecall/adminStrict, hydrateSlotRuntime·syncSlotRuntimeAdminAndTrajectory 본문,
applyPositionRecall schema, ADMIN SAVE, trajectory algorithm, Admin beginAdminInputSession 흐름

허용:
userInfoPanelModel.ts, UserAiPanel.jsx, App.jsx USER overlay/userInfoPanel 블록,
handleUserSearchStrategies 끝 hydrateSlotRuntime 호출 1줄(본문 수정 없이)

완료 후: 변경 파일, 매핑표 요약, npm run build, 검증 체크리스트, PROJECT_LOG §24 append 제안.
범위 외 refactor 금지.
```

---

## 12. 관련 문서

| 문서 | 용도 |
|------|------|
| `HANDOFF_USER_PHASE2_2026-05.md` | USER rail·Search·hydrate STEP 2-3 (병행 시) |
| `PROJECT_LOG_2026-05.md` §22 | USER rail stabilization |
| `PROJECT_LOG_2026-05.md` §23 | Admin UX Phase 1 (완료, 변경 금지) |
| `PROJECT_LOG_2026-05.md` §5.3 | SYS 이중 구현 — App.jsx SysOverlay만 수정 |

---

*문서 버전: 2026-05-27 · Admin Phase 1 푸시 후 · 다음: USER display Phase*
