# 이관 요약 (새 창용) — 2026-05 곡선 궤적 / Hermite baseline → 기울기·스핀 반영

작성일: 2026-05-09  
스코프: Trajectory 모듈 (`createCurveSegment` 안정화 완료) → 다음 작업 “기울기·스핀 값의 곡선 반영”

---

## 1. 목적 (한 줄)

A(Hermite) + 직선 C 곡선 baseline은 안정화되었으니, **새 창에서는 SYS 입력의 기울기(`curve_ratio`)·스핀 값을 곡선/궤적에 반영하는 작업만** 이어서 진행한다.

---

## 2. Repo / 브랜치 / 마지막 커밋

- 저장소 경로: `D:\3Cushion AI`
- 핵심 작업 디렉터리: `frontend/src/`
- 브랜치 / 마지막 커밋: **(직접 확인 필요)** — 이번 창 환경에서 git CLI 출력이 비어 있어 자동 캡처 실패. 새 창에서 시작 시 다음 명령으로 확인:
  ```
  git -C "D:\3Cushion AI" rev-parse --abbrev-ref HEAD
  git -C "D:\3Cushion AI" log -1 --format="%h %s"
  git -C "D:\3Cushion AI" status --short
  ```
- 본 세션의 코드 변경은 **로컬 작업 트리에만 반영**된 상태일 수 있음(미커밋 가능성). 최근 변경 파일은 §3 참조.

---

## 3. 완료한 작업 (사실만)

### 변경된 파일

- `frontend/src/utils/trajectory/curveTrajectory.ts` — 본 세션의 거의 모든 작업이 이 파일에서 발생.
- `작업관리/HISTORY/PROJECT_LOG_2026-05.md` — §3.5(Hermite 재설계), §7(다음 단계) 추가.

### 동작 요약 (사용자 관점)

- 직진/끌림(draw)/밀림(slide) 시 빨간 곡선이 **단일 방향, 단일-부풀음** 형태로 안정화됨(이전의 S자/역방향 튐/꺾임 제거).
- 곡선 시작점이 임팩트 접점에서 정확히 시작, 끝점은 `c1`에서 정확히 종료 → App.jsx 결합부에서 “c1 너머로 튀었다 되돌아오는” 폴드 없음.
- A↔C 접합부의 시각적 꺾임이 완화되어 폴리라인이 부드럽게 보임.

### 의도적으로 안 건드린 것

- `frontend/src/App.jsx`의 `createCurveSegment` 호출 시그니처(`impactContactRg, pathNodes[0], pathNodes[1], unifiedSlideForCurve`) — **변경 없음**.
- `frontend/src/components/table/ImpactLines.jsx` — **변경 없음**(red polyline은 계속 `cushionPathForImpactLines`만 그림).
- pathNodes/스핀 보정 블록(`App.jsx`의 `spinPathApplySpin` 등) — **변경 없음**(현재 일부 주석 처리된 영역 존재 가능, 새 창에서 분석 대상).
- SYS UI 라벨/순서(이미 §5에 반영된 변경) — **변경 없음**.

---

## 4. 설계 규칙 (반드시 지킬 것)

### 4.1 곡선 모델 불변 (안정 baseline)

`createCurveSegment(...)` 내부 `else` 분기(`effectLen >= 1e-9` && `chordSnapped >= 1e-9`)의 다음 구조는 **그대로 유지**한다.

- A: Hermite (`p0` → `snappedJoin`)
  - `t0Dir = normalize(dirToJoin + bendNormal * 1.2)`
  - `tHermite0 = t0Dir * chordSnapped * 0.4`
  - `tMidDir = normalize(correctionDir * 0.5 + toC1Dir_local * 0.5)` (안전 클램프 포함)
  - `tMid = tMidDir * chordSnapped * 1.0`
  - `hermiteSamples = max(12, floor(hermiteCutIdx * 1.5))`, `earlyRatio = 0.75`
  - `pHermite1 = snappedJoin`
- C: 직선 `sampleLineSegment(snappedJoin, c1, stepsB)`
- 결합 → 후처리: `[...segmentAWithHermite, ...linePoints.slice(1)]` → `smoothPolyline(curvePoints, 0.15)`
- 보장: s 단조 증가 가드, cone constraint(`t1Dir`), `bendNormal` inward 정렬

### 4.2 데이터 흐름 (한 줄)

`SYS 입력(slide/draw/curve_ratio/spin) → unifiedSlideForCurve / corrections / adminState → createCurveSegment(impactContactRg, pathNodes[0], pathNodes[1], unifiedSlideForCurve) → curveSegment → cushionPathForRender = [...curveSegment, ...cushionPath.slice(1)] → cushionPathForImpactLines → ImpactLines.redPolyline`

### 4.3 호출 시그니처 호환

`createCurveSegment`의 4번째 인자(`slide`)와 옵션(`{curveMode}`)은 현재 시그니처를 깨지 말 것. 기울기/스핀 도입 시 옵션 객체 확장 또는 별도 인자 추가만 허용.

---

## 5. 해결된 이슈

### 해결됨 (이번 세션)

- **증상**: draw/slide에서 S자 곡선 / 초반 역방향 튐  
  **원인**: Bezier P1·P2 방향 충돌, `inwardNormal`이 dir 기준으로 잘못 선택됨  
  **조치**: 곡선 모델을 Hermite로 교체. `bendNormal`을 `inwardNormal`과 dot 정렬해 항상 보정선 쪽으로 휨 보장. (`curveTrajectory.ts`의 `createCurveSegment` else 분기, `bendNormal` 정의부)

- **증상**: Hermite 도입 후에도 곡선이 거의 직선  
  **원인**: 양 끝 tangent(T0=startDir, T_mid=correctionDir)가 chord와 평행 → 수학적으로 직선 수렴  
  **조치**: `t0Dir`에 chord-수직 성분(`bendNormal * 1.2`) 합성. (`curveTrajectory.ts` 라인 1193 부근)

- **증상**: A↔C 접합 꺾임  
  **원인**: A 끝 접선과 C 시작 방향 불일치  
  **조치**: `tMidDir = correctionDir*0.5 + toC1Dir_local*0.5` 균등 블렌드. 안전 클램프 추가. (`curveTrajectory.ts` 라인 1218 부근)

- **증상**: 폴리라인 “울퉁불퉁”  
  **원인**: 샘플 밀도 낮음 + 접합부 미세 각도  
  **조치**: Hermite 샘플 1.5배 + `smoothPolyline(_, 0.15)` 후처리(끝점 고정 Laplacian 1패스). (`curveTrajectory.ts` 라인 296, 1252, 1274 부근)

### 아직 / 불명확

- **증상**: SYS 폼의 “기울기”와 “스핀” 값을 변경해도 곡선 모양이 달라지지 않음(또는 의도와 다르게 동작).  
  **재현**: 관리자 SYS 모달에서 기울기/스핀 입력 변경 → 화면의 빨간 곡선 형태 변화 부재 또는 불명확.  
  **기대 vs 실제**: 기대—기울기↑ 곡률↑, 스핀±에 따라 곡선 방향/세기 변화. 실제—`unifiedSlideForCurve`만 `bendNormal` 부호에 영향.  
  **첨부 가능 자료**: `PROJECT_LOG_2026-05.md` §3.5 / §7.1, 본 문서.

---

## 6. 남은 문제 / 다음 할 일 (우선순위)

### 1. [최우선] 기울기·스핀 값의 곡선 반영 — 분석 단계

- 완료 조건:
  - SYS의 “기울기”(`curve_ratio`)와 “스핀” 값이 어떤 상태 키 → 어떤 변수 → 어디서 곡선/노드에 반영되는지 **데이터 흐름 한 장 분석 보고**(파일/함수/라인 수준).
  - 이미 적용 중인 곳(예: `spinPathApplySpin` 활성/주석 여부) 확인.
  - `createCurveSegment`에 추가로 전달이 필요한지(곡선 곡률/방향 변조), pathNodes 단계에서만 처리해야 하는지 **분리 결정**.
- 산출물: 분석 노트 (수정 금지, 이번엔 읽기 전용).

### 2. [그다음] 적용 위치 선택 + 매핑 사양 정의

- 완료 조건:
  - (A) 곡선 단계 적용: `createCurveSegment(...)` 옵션 인자(`{tilt, spin}`) 추가, `t0Dir`/`tMid`의 magnitude·방향 변조 식 정의.
  - (B) pathNodes 단계 적용: 곡선 직전 노드 보정 식 정의.
  - 두 방식의 **적용 영역 중복 금지**.

### 3. [구현] 매핑 적용 + 회귀 검증

- 완료 조건:
  - 기울기=0, 스핀=0일 때 baseline과 **픽셀 단위 동일** (회귀 없음).
  - 양·음 값에서 시각적으로 의도대로 변함(테스트 케이스 3종 이상).

### 4. [부수] 디버그 로깅 일원화

- 완료 조건: `curveTrajectory.ts`/`App.jsx`/`ImpactLines.jsx`의 ingest POST·`console.log`를 단일 플래그(`DEBUG_TRAJ`) 기반으로 토글 가능.

---

## 7. 금지·주의 (실수 방지)

### 7.1 수정 금지 영역 (곡선 baseline 보호)

- `frontend/src/utils/trajectory/curveTrajectory.ts` 내 다음 항목:
  - `t0Dir` / `tHermite0` / `bendNormal` 계산 로직
  - `tMidDir` 0.5/0.5 블렌드 + 안전 클램프
  - `tMid` magnitude (`chordSnapped * 1.0`)
  - `segmentAWithHermite` 생성 + s 단조 증가 가드
  - cone constraint(`t1Dir`)
  - `pHermite1 = snappedJoin`, `sampleLineSegment(snappedJoin, c1, stepsB)`
  - 결합부: `[...segmentAWithHermite, ...linePoints.slice(1)]` → `smoothPolyline(_, 0.15)`
- `frontend/src/components/table/ImpactLines.jsx` — 변경 금지(이번 작업 범위 아님).
- `frontend/src/App.jsx`의 `createCurveSegment` 호출 시그니처 — 옵션 객체 확장 외 변경 금지.

### 7.2 사용자 규칙 (그대로 인용)

- “안정 baseline은 변경 금지. 변경이 필요하면 별도 옵션 인자/플래그 경로로 추가하고, 기본 경로는 그대로 둔다.” (PROJECT_LOG §7.1 보호 규약)
- “추측으로 리팩터하지 말 것 / 최소 변경.”
- “기울기/스핀 매핑 사양이 정의되기 전까지 곡선 파라미터를 임의로 바꾸지 말 것.”
- 작업 모드 명령 형식 유지: `[Mode: ask / inspect only]`(분석), `[Mode: execute - …]`(적용).

### 7.3 실패해서 롤백된 실험 (재도입 금지)

- `curveMode: "offsetDecay"` / `"tangentCurve"` 실험 코드
- A↔C 사이 짧은 Hermite 스무딩 구간(`smoothToC1Dir`/`smoothLen`/`pSmoothEnd`/`smoothPoints`)
- `extendedC1`(C를 c1 너머 2배 연장)
- `cStart`(C 시작점을 impact 쪽으로 당김)

---

## 8. 검증 방법

### 8.1 로컬 명령

- 타입 체크 (PowerShell):
  ```
  Set-Location "D:\3Cushion AI\frontend"
  npx tsc --noEmit -p .
  ```
- 빌드:
  ```
  Set-Location "D:\3Cushion AI\frontend"
  npm run build
  ```

### 8.2 UI 체크리스트

- [ ] 기울기=0, 스핀=0 상태에서 빨간 곡선이 이전과 **픽셀 단위로 동일**한가(회귀 없음).
- [ ] 기울기 양수/음수 변경 시 곡선의 **곡률 강도**가 의도대로 변하는가.
- [ ] 스핀 양수/음수 변경 시 곡선/후속 노드의 **방향/세기**가 의도대로 변하는가.
- [ ] A→C 접합부에 **꺾임 추가 발생 없음**.
- [ ] C 끝점이 `c1`에 정확히 일치하여 후속 cushionPath와 **점프 없이 연결**됨.
- [ ] 여러 트랙·두께·draw/slide 조합에서 **S자/역방향 튐 미발생**.

---

## 9. 열린 질문

1. 기울기(`curve_ratio`)와 스핀(`spin`)을 **곡선 단계**에서 적용해야 하는가, **pathNodes 단계**에서 적용해야 하는가? 두 단계 모두에 영향이 필요한가?
2. 스핀의 “회전 방향(좌/우)”이 곡선 곡률 방향(`bendNormal` 부호)에 어떻게 매핑되어야 하는가? `unifiedSlideForCurve` 부호와의 우선순위는?
3. 기울기 값 1단위가 곡률에 미치는 “표준 배율”은 어떤 단위계로 정의해야 하는가?(테이블 단위, 정규화, 또는 SYS 폼 단위)
4. 스핀이 후속 쿠션 반사각(C1→C2→C3)에까지 영향을 줘야 하는가, 아니면 첫 곡선 구간에만 한정되는가?
5. `App.jsx`에 일부 주석 처리되어 있는 “스핀 path 보정” 블록은 **재활성** 대상인가, **삭제** 대상인가?

---

## 10. Recall v1 canonical 안정화 (요약 — Authoring vs 추천 엔진)

**전체 기준**: `작업관리/HISTORY/PROJECT_LOG_2026-05.md` **§8** 참조. 본 절은 새 창에서 Recall 관련 질문이 섞일 때 **역할 분리**만 빠르게 확인하기 위한 요약이다.

- **관리자 Recall**: dataset **authoring / editing** 도구. **Ball3 위치만**으로 후보 탐색·선택.
- **coarse**: cue / target / second **각각** `abs(dx)+abs(dy) <= 6`를 만족해야 후보(AND).
- **선택**: coarse 통과 후 `ball3L1Sum` **최소 1건(Top1)**; 동률 시 `positionId` **`localeCompare`**.
- **제거됨(Recall 경로)**: `signature-not-found`, formulaHash 기반 recall 비교, `weightedBallDistance`, 엔진 threshold, Top3/`hits`/`RecallNearestHit`.
- **관리자 Recall ≠ 사용자 추천 엔진**. 추천 엔진(향후)은 runtime inference·nearest·interpolation·blended 등 **별도 사양**으로 정의하며, **현재 Recall 정책을 그대로 사용자 추천으로 확장하지 않는다.**
- **미변경(Recall 작업에서)**: trajectory, SYS, overlay, SAVE/history, `applyPositionRecall`, dataset/strategy schema, KD index 구조.
- **Git**: 권장 메시지 `refactor: stabilize recall v1 canonical matching` (해시는 로컬 확인).

Recall v1 canonical은 관리자(authoring) 전용 정책이며, 사용자 추천 엔진 정책은 향후 별도 정의한다.

---

## 부록: 시작 프롬프트 초안 (새 창에 그대로 붙여넣기 가능)

```
직전 세션 인계: 2026-05 Hermite curve baseline 안정화 완료 (PROJECT_LOG_2026-05.md §3.5 / §7 참조).
대상 파일: frontend/src/utils/trajectory/curveTrajectory.ts, frontend/src/App.jsx
보호 규약: 안정 baseline(Hermite A + 직선 C + smoothPolyline) 변경 금지.

[Mode: ask / inspect only]
다음 항목만 분석하고 보고해 주세요(절대 수정/로그 추가 금지).
1. SYS의 "기울기"(curve_ratio)와 "스핀" 입력이 저장되는 상태 키와 흐름.
2. 현재 코드에서 기울기/스핀이 이미 적용되는 위치(있다면 어느 함수/라인).
3. App.jsx의 spin path 보정 블록 활성/주석 상태.
4. createCurveSegment에 곡선 단계로 전달이 필요한지, pathNodes 단계 처리만으로 충분한지 분리 의견.

보고 형식: A. 입력 출처 / B. 현 적용 위치 / C. 적용 누락 위치 / D. 곡선 영향 가능성 / E. 권장 수정 지점 1곳 / F. 미해결 의사결정.
```

---

*End of SESSION_TRANSFER – 2026-05 Trajectory Hermite handoff*
