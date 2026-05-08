## Plan: Workspace Audit & Project Setup Requirements

This plan outlines how to audit your workspace for missing files, errors, and bugs, and to determine any dependencies or downloads required to run your project.

**Steps**

### Phase 1: Discovery & Inventory
1. List all files and folders in the workspace to establish a full inventory.
2. Identify the main project type (framework, language, build system) by reviewing key files (e.g., package.json, Dockerfile, README.md, next.config.ts, prisma/schema.prisma).
3. Check for the presence of critical files for each detected technology (e.g., Next.js, Prisma, Docker, etc.).

### Phase 2: Dependency & Configuration Check
4. Parse `package.json` for dependencies and scripts; check for missing lock files or config files.
5. Review `Dockerfile` and `docker-compose.yml` for referenced files or build contexts that may be missing.
6. Check for `.env` or other environment/config files referenced in code or documentation.
7. Review `prisma/schema.prisma` and migrations for database requirements.

### Phase 3: Error & Bug Scan
8. Scan for common errors:
   - Missing imports or files in TypeScript/JavaScript code.
   - Syntax errors or incomplete files.
   - Linting or type errors (if lint/type config present).
9. Check for incomplete or placeholder files (e.g., empty files, TODOs).

### Phase 4: Setup & Download Requirements
10. Summarize all required installations (Node.js, pnpm, Docker, Prisma CLI, etc.).
11. List any manual downloads or setup steps (e.g., environment variables, database seeding).

**Relevant files**
- `package.json` — Node.js dependencies and scripts
- `pnpm-lock.yaml` — Lock file for pnpm
- `Dockerfile`, `docker-compose.yml` — Docker build and orchestration
- `prisma/schema.prisma`, `prisma/migrations/` — Database schema and migrations
- `README.md`, `FILE_UPLOAD_GUIDE.md` — Documentation for setup instructions
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` — Project configuration
- `.env` (if present or referenced) — Environment variables

**Verification**
1. Confirm all referenced files in configs and code exist.
2. Validate `package.json` scripts and dependencies are consistent with the codebase.
3. Check for missing or incomplete migration files in `prisma/`.
4. Ensure Docker build context is complete (no missing files).
5. List all required installations and downloads for a successful local run.
6. Summarize any errors, missing files, or blockers found.

**Decisions**
- Will focus on the main app (Next.js, Prisma, Docker) and not on optional or unused folders.
- Will not run code/tests, only static analysis and file presence checks.
- Will highlight any ambiguity or missing documentation for setup.

**Further Considerations**
1. If `.env` or secrets are required but missing, recommend creating or requesting them.
2. If database access is needed, clarify if a local or remote DB is expected.
3. If any referenced files are not found, recommend next steps (e.g., restore from version control, request from repo owner).

---

Would you like a summary of required installations and setup steps, or a detailed report of all missing files and errors found? If you have a specific environment (e.g., Windows, WSL, Docker), please confirm for tailored instructions.