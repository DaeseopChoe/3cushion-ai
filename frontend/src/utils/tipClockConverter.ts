// frontend/src/utils/tipClockConverter.ts

/**
 * theta(라디안) → 시각 표시
 * 제미나이 매핑: 3시=0°, 12시=90°, 1팁=45분
 * - theta=0 (우측, 3시) → "3시"
 * - theta=π/2 (상단, 12시) → "12시"
 * - theta=π/8 (22.5°) → "2시 15분" (3팁 방향)
 */
export function convertThetaToClock(theta: number): string {
  if (theta == null || isNaN(theta)) return "--";
  // 우측(3시)=0° → 180분, 상단(12시)=90° → 0분. theta 0~π/2 → 180~0분
  const minutesFrom12 = 180 - (theta * (180 / (Math.PI / 2)));
  const normalized = ((minutesFrom12 % 720) + 720) % 720;
  let hour = Math.floor(normalized / 60);
  const minute = Math.round((normalized % 60) * 10) / 10;
  if (hour === 0) hour = 12;
  if (minute === 0) return `${hour}시`;
  return `${hour}시 ${minute}분`;
}

export function convertTipToClock(
  direction: "right" | "left",
  tip: number
): string {
  if (tip == null || isNaN(tip)) return "--";

  const minutesPerTip = 45; // 1팁 = 45분
  let totalMinutes = tip * minutesPerTip;

  // 좌측이면 반시계 방향
  if (direction === "left") {
    totalMinutes = -totalMinutes;
  }

  const fullCircle = 12 * 60; // 720분

  // 음수 보정 및 720분 초과 방지
  totalMinutes = ((totalMinutes % fullCircle) + fullCircle) % fullCircle;

  let hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  if (hour === 0) hour = 12;

  if (minute === 0) {
    return `${hour}시`;
  }

  return `${hour}시 ${minute}분`;
}
