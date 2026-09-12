/**
 * Phase 3E-1 — ADMIN-only (and rare) UI deferred from USER initial JS.
 * Named/default exports wrapped for React.lazy.
 */
import { lazy } from "react";

export const LazySysOverlay = lazy(() =>
  import("./SysOverlay").then((m) => ({ default: m.SysOverlay }))
);

export const LazyHptOverlay = lazy(() =>
  import("./HptOverlay").then((m) => ({ default: m.HptOverlay }))
);

export const LazyStrOverlay = lazy(() =>
  import("./HptOverlay").then((m) => ({ default: m.StrOverlay }))
);

export const LazyAiOverlay = lazy(() =>
  import("./AiOverlay").then((m) => ({ default: m.AiOverlay }))
);

export const LazyAnchorEditOverlay = lazy(() =>
  import("./AnchorEditOverlay").then((m) => ({ default: m.AnchorEditOverlay }))
);

export const LazyCategoryManageModal = lazy(() =>
  import("./CategoryManageModal")
);

export const LazyLessonOrderManageModal = lazy(() =>
  import("./LessonOrderManageModal")
);

export const LazyWorkspaceHistoryModal = lazy(() =>
  import("../WorkspaceHistoryModal")
);

export const LazyDerivedReviewOverlay = lazy(() =>
  import("../table/DerivedReviewOverlay")
);

export const LazyJoystickCoordinateEditor = lazy(() =>
  import("../table/JoystickCoordinateEditor")
);

export const LazyRealInterpolationPanel = lazy(() =>
  import("../user/RealInterpolationPanel.jsx")
);
