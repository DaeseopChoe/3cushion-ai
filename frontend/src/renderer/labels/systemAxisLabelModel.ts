interface AnchorWithCoord {
  coord: { x: number; y: number };
  [key: string]: unknown;
}

interface TrackAnchorItem {
  id?: string;
  [key: string]: unknown;
}

interface SystemAxisLabelModelArgs {
  appMode: string;
  userAxisGridLabelsActive: boolean;
  visibleKeysForLabels: string[];
  trackAnchorItems: TrackAnchorItem[];
  allAnchors: Record<string, AnchorWithCoord | null>;
}

interface LabelAnchorEntry {
  coord: { x: number; y: number };
  value: number;
}

interface SystemAxisLabelModel {
  labelAnchorsForRaw: Record<string, LabelAnchorEntry[]>;
  labelAnchorsForRender: Record<string, LabelAnchorEntry[]>;
  allAnchorsForLabels: Record<string, AnchorWithCoord>;
}

export function buildSystemAxisLabelModel({
  appMode,
  userAxisGridLabelsActive,
  visibleKeysForLabels,
  trackAnchorItems,
  allAnchors,
}: SystemAxisLabelModelArgs): SystemAxisLabelModel {
  const labelAnchorsForRaw: Record<string, LabelAnchorEntry[]> = {};
  trackAnchorItems.forEach((a) => {
    const id = a?.id;
    if (typeof id !== "string") return;
    const match = id.match(/^([A-Z0-9]+)_\(([-\d.]+),([-\d.]+)\)_(\d+)/);
    if (!match) return;
    const label = match[1];
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);
    const value = parseFloat(match[4]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(value)) return;
    if (!labelAnchorsForRaw[label]) {
      labelAnchorsForRaw[label] = [];
    }
    labelAnchorsForRaw[label].push({ coord: { x, y }, value });
  });

  const labelAnchorsForRender =
    appMode === "USER" && userAxisGridLabelsActive
      ? Object.fromEntries(
          visibleKeysForLabels
            .filter((k) => k !== "C2" && labelAnchorsForRaw[k])
            .map((k) => [k, labelAnchorsForRaw[k]])
        )
      : labelAnchorsForRaw;

  const allAnchorsForLabels = Object.fromEntries(
    visibleKeysForLabels
      .map((k) => [k, allAnchors[k]])
      .filter((entry): entry is [string, AnchorWithCoord] => {
        const v = entry[1];
        return v != null && v.coord != null;
      })
  );

  return { labelAnchorsForRaw, labelAnchorsForRender, allAnchorsForLabels };
}
