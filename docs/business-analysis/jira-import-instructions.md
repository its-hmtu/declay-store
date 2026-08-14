# Importing the Declay Store backlog into Jira

The file `jira-backlog-import.csv` contains the full backlog from `04-feature-backlog-roadmap-gap-analysis.md`: **9 epics + 32 user stories**, each with priority, story-point estimate, labels, and a description that includes acceptance criteria.

## How to import (Jira Cloud)

1. In Jira, go to your project (or create one, e.g. key `DECLAY`).
2. **Project settings → Import** (or top-right **Filters → Advanced issue search**, then the import option), or use **Settings (gear) → System → External System Import → CSV** for a full import.
3. Upload `jira-backlog-import.csv`.
4. Map the columns when prompted:
   - `Summary` → Summary
   - `Issue Type` → Issue Type
   - `Priority` → Priority
   - `Epic Name` → Epic Name (epics only)
   - `Epic Link` → Epic Link (stories link to their epic by name)
   - `Story Points` → Story point estimate (your estimation field)
   - `Labels` → Labels
   - `Description` → Description
5. Run the import. Epics are created and stories are linked to them via **Epic Link**.

## Notes

- **Priority mapping:** P0 → Highest, P1 → High, P2 → Medium.
- **Estimates:** T-shirt sizes converted to points (S = 2, M = 5, L = 8) and also kept as a label (`S-size`/`M-size`/`L-size`).
- If your project is **team-managed**, Epic Link may import as a parent link; verify the epic/story hierarchy after import and adjust if needed.
- Launch-blocking items are the **Highest** priority rows (epics A, B-partial, I) — see the roadmap doc for phase sequencing.

## Phase grouping (for sprint planning)

- **Phase 0 (Launch):** A1–A4, B1, I1, I2, I4
- **Phase 1 (Complete the store):** C1–C2, D1–D2, E1–E2, F1–F2, B2–B3, H1, H5, I3
- **Phase 2 (Differentiate):** G1–G3, H2–H4, E3, F3–F4, D3, I5
