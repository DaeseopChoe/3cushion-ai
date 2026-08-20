import { useCallback, useState } from "react";
import type { DerivedCandidateIdentity } from "../domain/family/cueImpactDerivedReview";
import type { FamilyTrack } from "../domain/family/trackSymmetry";

export type DerivedReviewMode = "REVIEW" | "INSPECT" | null;

export type DerivedReviewInspectSnapshot = {
  ballsState: unknown;
  adminState: unknown;
  overlayState: unknown;
  targetColor: string | null;
  isTargetSelected: boolean;
  shotEditor: unknown;
  activeSlot: string;
};

export function useCueImpactDerivedReviewUi() {
  const [reviewMode, setReviewMode] = useState<DerivedReviewMode>(null);
  const [viewingTrack, setViewingTrack] = useState<FamilyTrack | null>(null);
  const [selectedCandidateIdentity, setSelectedCandidateIdentity] =
    useState<DerivedCandidateIdentity | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [inspectSnapshot, setInspectSnapshot] =
    useState<DerivedReviewInspectSnapshot | null>(null);

  const startReview = useCallback((authoredTrack: FamilyTrack) => {
    setReviewMode("REVIEW");
    setViewingTrack(authoredTrack);
    setSelectedCandidateIdentity(null);
    setOverlayVisible(true);
    setInspectSnapshot(null);
  }, []);

  const resetReviewUi = useCallback(() => {
    setReviewMode(null);
    setViewingTrack(null);
    setSelectedCandidateIdentity(null);
    setOverlayVisible(true);
    setInspectSnapshot(null);
  }, []);

  const enterInspect = useCallback((identity: DerivedCandidateIdentity) => {
    setReviewMode("INSPECT");
    setSelectedCandidateIdentity(identity);
    setOverlayVisible(false);
  }, []);

  const exitInspectToReview = useCallback(() => {
    setReviewMode("REVIEW");
    setSelectedCandidateIdentity(null);
    setOverlayVisible(false);
    setInspectSnapshot(null);
  }, []);

  return {
    reviewMode,
    viewingTrack,
    selectedCandidateIdentity,
    overlayVisible,
    inspectSnapshot,
    setViewingTrack,
    setOverlayVisible,
    setInspectSnapshot,
    startReview,
    resetReviewUi,
    enterInspect,
    exitInspectToReview,
    isReviewActive: reviewMode === "REVIEW",
    isInspectActive: reviewMode === "INSPECT",
  };
}
