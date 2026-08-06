# ADR — Mission 04 Authoring Integration Absorbed

| Field | Value |
|-------|--------|
| **Status** | **Accepted** |
| **Date** | 2026-08-06 |
| **Phase** | Phase 4 — Product Pipeline |
| **Decision** | Mission 04 is **ABSORBED**; no separate implementation Mission |

---

## Context

Phase 4 Product Pipeline roadmap originally listed four Missions:

1. Export Pipeline  
2. Published Package Builder  
3. Deployment Workflow  
4. Authoring Integration  

After Missions 01–03, Mission 04 was reviewed against actual Product Layer code.

---

## Decision

**Mission 04 (Authoring Integration) does not require a separate Mission.**

Authoring → Export → Generator Host → Export Handoff → Package → Deploy continuity is already covered by:

| Concern | Covered by |
|---------|------------|
| Authoring Adapter → Product Host → Generator → Handoff | Mission 01 (`product/` Export) |
| Export Handoff → Published Package | Mission 02 |
| Published Package → Deployment prepare/report | Mission 03 |
| End-to-end continuity CLI | `python -m product pipeline` |

---

## Consequences

- Phase 4 Product Pipeline is **COMPLETE** with Missions 01–03 + this ADR.
- No additional Authoring Integration code Mission is scheduled.
- Future Authoring UX polish (Display Boundary, Handle Drag, etc.) remains **Product Carry**, not Mission 04.
- Search Quality / Real Interpolation remains **Phase 5**, not Phase 4 Mission 04.

---

## Non-Claims

- Does not change Architecture Freeze.
- Does not change Generator / Search / Runtime responsibilities.
- Does not authorize Git Push or Vercel Publish as part of absorbed Mission 04.
- Does not reopen Mission 01–03 scopes.

---

## References

- `PROJECT_MASTER_INDEX.md` (Status)
- `HISTORY/PROJECT_LOG_2026-08.md` (Mission 03 / Phase 4 Complete entry)
- `작업관리/GLOSSARY_SSOT.md` §5.2
- `product/__main__.py` (`pipeline` command)
