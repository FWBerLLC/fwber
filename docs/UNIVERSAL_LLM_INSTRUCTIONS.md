# Universal LLM Instructions — fwber

> **CRITICAL: This is the single source of truth for all AI agents working on fwber.**
> All agent-specific files (`CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`, `AGENTS.md`) MUST reference this file first. 
> *Never stop the party. Keep on goin'. Don't ever stop baby! Don't ever quit!*

## 1. Project Context & Vision

fwber is an open-source, privacy-first proximity dating platform. It combines AI-generated avatars with location-based discovery. The core loop is: Register -> Onboard -> Discover -> Match -> Chat.
For a deep dive into the project's philosophy, refer to `VISION.md`.

- **Stack:** Laravel 12 (PHP 8.4) + Next.js 16 (React 18) + MySQL + Rust (Geo-Screener)
- **License:** MIT
- **Hosting:** DreamHost Shared (current), Docker/Kubernetes ready

## 2. Autonomous Execution Protocol (ACTIVE)

When instructed to "proceed," "keep going," or "do not stop," you must adhere to the following autonomous execution loop without requiring human confirmation:

1. **Deep Analysis:** Reanalyze the entire project, conversation logs, and all archived documentation in extreme detail before making a move. Scrape every possible detail about project intentions, goals, design, direction, completed parts, partials, and missing items.
2. **Feature Selection:** Identify missing, incomplete, or unpolished features (backend without frontend representation, etc.) from `ROADMAP.md` or `TODO.md`.
3. **Execution & Implementation:** Implement the feature thoroughly. Ensure it is extremely robust, well-documented, and fully represented in the UI (wide breadth of options, labels, tooltips, descriptions). No bugs, no missing/hidden functionality. Combine redundant functionality for the most robust project possible.
4. **Subagents:** Use subagents if possible to implement features and compartmentalize work.
5. **Git Operations:** 
   - Pull from origin main to ensure no regression.
   - Update all submodules (`git submodule update --init --recursive`) and merge upstream changes (including forks). Intelligently resolve any conflicts.
   - Intelligently and selectively merge all feature branches (especially local `FWBerLLC` forks) into `main` and vice-versa, without losing progress.
   - **Commit and Push:** After completing a feature, perform a `git add .`, `git commit -m "feat: ... (vX.Y.Z)"`, and `git push`. DO NOT LOSE PROGRESS. Erring on the side of caution.
6. **Version Bumping:** **EVERY BUILD OR COMPLETED FEATURE MUST HAVE A NEW VERSION NUMBER.** Update the `VERSION` text file and `CHANGELOG.md`. Reference the version bump in your commit message.
7. **Documentation Sync:** Immediately update `ROADMAP.md`, `TODO.md`, `PROJECT_STATUS.md`, `HANDOFF.md`, and `docs/SUBMODULE_DASHBOARD.md` to reflect the new reality. Clearly distinguish between what is done and what remains.
8. **Continuous Loop:** Do not stop. Proceed to the next missing feature autonomously. Keep going for as long as is possible. Correct errors along the way and continue researching.

## 3. Communication & Memory Protocol

- **Extreme Detail:** Document input information, your findings, and your implementation steps in comprehensive, full extreme detail in `HANDOFF.md`. Pay very close attention to particular details provided by the user in dense paragraphs.
- **Clarification:** If a goal or direction is uncertain, ask the user to clarify and reword it to develop a clearer description of the ultimate vision.
- **Memory Management:** Maintain `MEMORY.md` with ongoing observations about codebase and design preferences. Use system memory tools at the start and end of every session. Summarize what you learned that wasn't obvious.
- **Commenting Code:** Always comment your code in depth. Explain *what* it is doing, *why* it is there, *why* it is designed that way, along with any analysis, findings, side effects, bugs, optimizations, alternate methods, and non-working methods. If existing code lacks comments and needs them, add them. Do not add redundant comments to self-explanatory code.

## 4. Versioning & Changelog Protocol

- **Single Source of Truth:** `VERSION` or `VERSION.md` in the project root. This is the ONLY place the hardcoded version should exist. Internal version numbers must literally reference this global text file.
- **Update Frequency:** Update the version number upon every build or feature completion.
- **Changelog:** Maintain a detailed `CHANGELOG.md`. Ensure all internal/external version references synchronize with `CHANGELOG.md`.
- **UI Visibility:** The application UI should prominently display the current version by reading it dynamically from the `VERSION` file.

## 5. Submodules & Dependencies

- Research all libraries, submodules, referenced projects, and packages in great depth. Intelligently infer their reason for selection.
- Create/update a dashboard page `docs/SUBMODULE_DASHBOARD.md`. This dashboard must list all submodules, their versions, locations, dates, build numbers, and a clear explanation of the project directory structure.
- Add referenced external code as git submodules when appropriate, for reference and easy access. Update all submodules inside all submodules and commit/push each.

## 6. Ideas & Deep Analysis (IDEAS.md)

- Use your tools creatively. Go through each repo one by one and analyze in extreme depth.
- Come up with missing features, improvements, refactoring, renaming, restructuring, language ports, concept pivots, etc. Document this exhaustive list in `IDEAS.md`.

## 7. Model-Specific Role Overrides

*See individual files (`CLAUDE.md`, `GEMINI.md`, `GPT.md`) for proprietary instructions specific to those models. They must read this universal file first.*