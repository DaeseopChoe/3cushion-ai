# C2 Reflection 실패 분석 보고서 템플릿

로그 실행 후 아래 항목을 채워 주세요.

## 로그 출력 항목 (v2)

| 항목 | [C2_ANALYZE] input | [C2_ANALYZE] failure summary |
|------|-------------------|------------------------------|
| Rail Detection | c1Rail, c3Rail | railDetection: OK/FAIL |
| Snap 영향 | dx_snap, dy_snap | snapImpact: NONE/SMALL/LARGE |
| Ray 방향 | dotDirRay, rayDirectionReversed | rayDirection: OK/REVERSED |
| Rail 순서 | orderedRails, railOrderingOk | railOrdering: OK/WRONG |
| 교차점 | triedRails | intersectionState, c2Candidates |
| Segment | rail candidate별 segmentOk | segmentCheck: OK/OUTSIDE |
| Guard | thetaOutDeg, m_min, theta_t_max | guardBlocked: YES/NO |
| 원인 | - | primaryCause |

---

## 시나리오 1 — F5 직후 정상 화면

- [ ] `[C2_ANALYZE] 2C from anchors (stored)` 로그 출력 여부: 예 / 아니오
- [ ] 2C 표시 좌표: `anchors["2C"]` = ___________
- [ ] reflection 계산 경유 여부: 예 / 아니오 (저장 anchor 사용 시 "아니오")

---

## 시나리오 2 — SYS 수정 후 비정상 화면

### 1. CO / 1C / 3C 입력 자체는 유효한가?

- [ ] 유효 / 부분 유효 / 무효
- [ ] 이유: ___________

### 2. C3 snap이 직접 원인인가?

- [ ] 예 / 아니오 / 일부 영향
- [ ] C3_original: ___________
- [ ] C3_snapped: ___________
- [ ] 이유: ___________

### 3. orderedRails가 맞는가?

- [ ] 맞음 / 의심됨 / 틀림
- [ ] orderedRails: ___________
- [ ] c1Rail: ___________ / c3Rail: ___________
- [ ] selectedBy: ___________
- [ ] 이유: ___________

### 4. 각 후보 rail 실패 사유

- [ ] RIGHT: ___________
- [ ] BOTTOM: ___________
- [ ] LEFT: ___________

### 5. 실제 원인 1순위

- [ ] 입력 좌표 문제
- [ ] C3 후처리 문제
- [ ] orderedRails 문제
- [ ] 교차 판정 조건 문제
- [ ] 세그먼트 방향/범위 판정 문제

### 6. 수정이 필요하다면 어느 레이어인가?

- [ ] App.jsx 호출부
- [ ] rail candidate ordering
- [ ] reflection intersection guard
- [ ] snapped point handling
- [ ] 기타: ___________

---

## 로그 출력 항목 요약

| 로그 태그 | 출력 시점 |
|-----------|-----------|
| `[C2_ANALYZE] 2C from anchors (stored)` | anchors["2C"] 존재 시 (reflection 미실행) |
| `[C2_ANALYZE] input (rail detection failed)` | c1Rail 또는 c3Rail null 시 |
| `[C2_ANALYZE] input` | reflection 시도 시 (CO_rail, C1_rail, C3_original, C3_snapped, orderedRails 등) |
| `[C2_ANALYZE] rail candidate` | 각 후보 레일별 (교점, rejectedReason) |
| `[C2_ANALYZE] failure summary` | reflection 실패 시 (triedRails 전체) |
