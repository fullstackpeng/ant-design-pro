# CLAUDE.md

## Project

Ant Design Pro — React enterprise boilerplate on Umi Max v4, antd v6, ProComponents v3.

## Commands

`npm start` (dev+mock), `npm run dev` (no mock), `npm run build` (utoopack), `npm run lint` (Biome+tsc), `npm run test` (Jest), `npx antd lint ./src` (antd-specific checks).

Other: `npm run openapi` (regenerate `src/services/`), `npm run simple` (**irreversible** — commit first), `npm run biome` (auto-fix), `npm run tsc` (type-check only).

## Critical Rules

- **Never edit `src/services/ant-design-pro/`** — auto-generated, regenerate with `npm run openapi`
- **Biome only** — no ESLint, no Prettier. Both `npm run lint` and `npx antd lint ./src` must pass before commit
- **Always `npx antd info <Component>` before writing antd code** — don't guess APIs from memory
- **`npm run simple` is irreversible** — always commit/branch first
- **Conventional commits** required (commitlint enforced)
- **TypeScript strict** · **Node ≥ 22** · **`package-lock.json`** (not yarn/pnpm)
- **`.umi` dir is auto-generated** — delete `src/.umi` and restart if dev server acts up

## Architecture Essentials

### Mandatory implementation conventions

Before implementing a feature, inspect the closest existing module and name the reference in the progress update. Reuse its directory structure, naming, request handling and state patterns. If no suitable reference exists, explain the concrete design choice; routine implementation choices do not require another approval step.

Reference implementations:

| Concern | Reference |
| --- | --- |
| Management page and API wrapper | `src/pages/management/plans/index.tsx`, `plans/service.ts` |
| Tenant business logic and DTOs | `backend/src/tenants/members.controller.ts`, `members.service.ts`, `dto/` |
| Platform business logic and DTOs | `backend/src/platform/platform.controller.ts`, `platform.service.ts`, `dto/` |
| Authorization and page capabilities | `backend/src/auth/authorization.service.ts`, `page-registry.ts`, `permissions.ts` |

- **Business ownership**: tenant members and roles belong to `tenants/`; platform accounts belong to `platform/`. `navigation/` manages menu configuration and builds navigation from authorization results. Do not put unrelated CRUD services in a module merely because its page has a menu entry.
- **Dependency direction**: authentication and authorization must not import navigation, tenant or platform business modules. Shared authorization lives in `auth/authorization.module.ts`; business modules may consume it. Keep Nest module dependencies acyclic.
- **Frontend request boundary**: management page/component code calls its page-local `service.ts`; only that wrapper imports generated backend clients. Keep transport options, generated parameter objects and request normalization in the wrapper. Shared cross-page API adapters may live in `src/services/`. Do not edit generated clients manually.
- **Backend layers**: controllers handle routing, DTOs and response declarations; services enforce business rules and transactions. Reuse `success()`, `json()`, `pagination()` and `transaction()` where applicable. Public create/update operations have explicit service methods; share private validation only when it removes real duplication.
- **DTO layout**: new business DTOs live under the owning module's `dto/`, named `<entity>-request.dto.ts` and `<entity>-response.dto.ts`. Response DTOs must not inherit or import request validation classes. Use runtime DTO imports for controller parameters and explicit response projections where persistence models contain extra fields. The existing `navigation/navigation.dto.ts` is legacy layout, not a template for new DTOs.
- **Authorization declarations**: declare each page's `permissionCode`, default member access and menu eligibility in `auth/page-registry.ts`; declare action dependencies in `auth/permissions.ts`. Do not infer authorization from page names, permission suffixes or scattered page-code special cases. Frontend visibility and backend checks use the same stable permission codes; backend enforcement is mandatory. Keep administrator-only safeguards explicit.
- **Menu icons**: dynamic menus from `app_menus` resolve icons only through the local whitelist in `src/services/navigation.tsx` (`menuTree()`); an unlisted `icon` code silently renders no icon. When adding or changing a menu icon code, add the matching antd icon to that whitelist and cover it in `src/services/navigation.test.tsx`. Verify the code against `app_menus.icon`, not only `config/routes.ts`.
- **Scope and decomposition**: preserve behavior, API operation IDs and tenant isolation during structural refactors. Keep existing `ProTable + ModalForm` patterns; extract a component/hook only for concrete complexity or reuse. Avoid unrelated formatting and speculative generic layers. Do not alter an applied migration to perform a source-code refactor.
- **Delivery checks**: review changed files against the reference module, check dependency direction, request wrappers, DTO ownership and duplicated rules, then run focused behavior tests plus required lint/type checks. Report necessary deviations and verification limits. Do not treat passing tests as evidence that module boundaries are correct.

`npm run lint:architecture` enforces literal import boundaries for management pages, auth/business modules, tenant roles and response/request DTOs; it is included in `npm run lint`. These import checks supplement the manual structural review above.

When adding or changing page/action permissions or `@RequirePermission` declarations, run `npm run test:permissions`. This checks unique permission codes, registered dependencies, dependency cycles, page references and actual Nest controller metadata (including class defaults and inherited HTTP handlers). The check is also included in backend tests and CI; it does not connect to a database or launch a browser. Backend dependencies must be installed; Prisma generation requires a `DATABASE_URL`, which may be a dummy URL for this metadata-only check.

**Config**: `config/config.ts` (defineConfig), `config/routes.ts` (declarative routes). Route `name` → `menu.xxx` i18n key; `access` field gates visibility.

**Convention files** (`src/`): `app.tsx` (runtime config + `getInitialState`), `access.ts` (permissions), `global.tsx` (side effects), `loading.tsx`, `typings.d.ts`.

**Auth**: `getInitialState()` → `GET /api/currentUser`; 401 → redirect login. `access.ts`: `canAdmin = currentUser.access === 'admin'`. Mock creds: `admin`/`ant.design` or `user`/`ant.design`.

**State**: `useModel('filename')` for global hooks (`src/models/`). `useModel('@@initialState')` for currentUser/settings. ProTable `request` prop for most data loading. `@tanstack/react-query` for complex server state.

**Styling priority**: Tailwind CSS v4 (layout) → antd-style v4 / `createStyles` (theme tokens) → CSS Modules → Less (legacy only).

**Request**: built-in `request` from `@umijs/max`, configured in `src/requestErrorConfig.ts`. Per-page `service.ts` for non-generated APIs.

**i18n**: 8 locales in `src/locales/`. `useIntl().formatMessage({ id, defaultMessage })`.

**Mock**: `mock/` (global) + `src/pages/**/_mock.ts` (co-located). Express-style handlers.

**Cloudflare Worker**: `cloudflare-worker/` — separate Hono app, own `package.json`, not an npm workspace.

## AI Skills

This project ships with two built-in Claude Code Skills (`.claude/skills/`). If you already have these skills in your project, no installation is needed — just run them directly. To update to the latest skill definitions, run `npx skills add ant-design/ant-design-pro`.

### `/pro-upgrade` — Project Upgrade

Run `/pro-upgrade` in Claude Code to auto-upgrade the project to the latest Ant Design Pro version. It diffs the latest template against this project and merges framework changes while preserving business code. Works for any version gap (v5→v6, v6.x→latest, etc.).

### `/antd` — Ant Design CLI

Run `/antd` in Claude Code for any antd-related work. It provides access to `@ant-design/cli` with offline metadata for antd v3/v4/v5/v6. Key commands:

- `npx antd info <Component>` — look up props/API before writing code (mandatory)
- `npx antd lint ./src` — check for deprecated or problematic usage (must pass before commit)
- `npx antd demo <Component> <demo>` — get working code examples
- `npx antd migrate <from> <to>` — migration checklist between major versions

## Page Co-location

Each page dir: `index.tsx`, optional `service.ts`, `_mock.ts`, `data.d.ts`, style files. Keep page-specific code with the page.

## Audit logging requirements

The audit feature exposes operation logs and login logs in both platform and tenant contexts. Every subsequent feature must include its audit integration in the same delivery. The initial release covers the existing backend business modules listed below.

### Coverage and future feature delivery

- Audit business mutations and sensitive actions, including sensitive reads, downloads, credential access, connection tests, manual triggers and reruns. Ordinary list/detail reads, health checks, static assets and polling do not require operation events; classify endpoints explicitly rather than relying only on HTTP methods.
- Initial coverage includes authentication; personal profile, password, avatar and session management; platform accounts; tenants, plans, subscriptions and feature assignments; menus; tenant members, roles, departments and positions; platform and tenant dictionaries; system settings; storage providers; files and asset uploads; platform and tenant notifications and inbox read-state changes; MQTT configuration, credentials, brokers, administrative actions and message deletion; scheduled task management, triggering and reruns; and business actions performed through realtime or background workers.
- Keep MQTT message traffic, socket heartbeat traffic, queue mechanics and task execution diagnostics in their dedicated records. Audit the associated business action and link to its execution record instead of duplicating every transport event. Existing frontend-only examples require no synthetic backend events; classify and integrate them when real business actions are added.
- Every new or changed backend handler must declare its audit classification: audited business action, login event, or explicit exemption with a reason. Add an automated coverage check alongside the implementation that rejects unclassified HTTP handlers and checks sensitive GET handlers. Explicitly inventory worker and realtime business entry points as well; HTTP metadata checks alone cannot prove their coverage.
- Shared infrastructure should capture safe request metadata automatically, while owning services provide stable event codes, target identity and allowlisted business changes. Do not treat raw request/response capture as business auditing.
- New features are incomplete without audit declarations, actual event emission, tenant visibility rules, redaction and appropriate behavior tests. Record and verify coverage in the delivery review; documentation alone is not automatic enforcement.
- Implementation references: `audit/audit-action.ts` provides service-level `@AuditAction` and handler-level `@AuditEndpoint`; `audit/audit-context.ts` owns request-local context and the safe-field whitelist. Use stable event codes and declare the target entity explicitly. Pure database actions use the default transactional mode; actions involving external side effects use `mode: 'external'`, which also writes transactional checkpoints for database changes. Never move external I/O into a retried database action. Consume `PrismaService` from `DatabaseModule` so request-local transaction routing remains active.
- `npm run test:permissions` includes audit handler coverage and redaction checks; `npm run test:audit` runs the PostgreSQL audit lifecycle tests in isolated schemas. Add behavior assertions for non-HTTP entry points as well. The system-owned retention cleaner starts with the backend Worker, runs at startup and hourly, and requires that Worker to remain running. Retention defaults to 180 days per log type and accepts 1–3650 days.

### Ownership, visibility and event integrity

- Keep audit persistence independent of navigation and business modules. Separate the minimal audit writer from query/authorization concerns as needed to preserve acyclic dependencies; authentication must not acquire a dependency on tenant or platform business modules.
- Platform administrators can query platform and tenant events. Tenant queries must derive scope from the authenticated context and enforce it on both list and detail endpoints. Ordinary tenant members have no default audit access; any delegated access uses explicit registered permissions and backend enforcement.
- Distinguish actor context, affected tenant and event visibility. A platform administrator acting on tenant data remains a platform actor; target tenant identity alone must not expose platform-internal details to that tenant. Record actor and target display snapshots so later renames or deletions do not erase meaning. Do not cascade-delete audit records when users, targets or tenants are deleted.
- Record successful database mutations and their operation events in the same transaction, including transactional retries. Write failure events outside rolled-back transactions. Distinguish business failure, authorization denial, accepted asynchronous work and final execution outcomes; do not report external effects as successful merely because a request was accepted.
- Capture authentication success, failed attempts and explicit logout. Failed login records must preserve bounded attempted account/tenant identifiers without asserting authenticated identity or exposing cross-tenant account details. Session expiry is not an explicit logout. Guard rejections and validation failures need appropriate coverage outside controller-only interception.
- Use stable event identifiers and request/execution correlation identifiers to link events and avoid duplicate emission on worker retries. Keep existing specialized audit histories, linking unified events to them where appropriate. Do not invent missing metadata when exposing historical records.
- Use allowlisted, bounded snapshots and safe error summaries. Never persist passwords, password hashes, cookies, session tokens, access keys, secret values, signed URLs or raw file/message bodies. Derive client IP only through the configured trusted proxy chain.
- Audit records are append-only through application interfaces; provide no edit, single-record delete or clear-all action. Automated retention cleanup is the controlled exception. Critical database mutation audit failures roll back the mutation; failed-attempt logging must preserve the original authentication/authorization response and surface persistence failures through operational monitoring.

### Configurable retention

- Retention is configurable separately for operation logs and login logs. The initial configuration is platform-managed and applies across the installation; tenant-specific overrides are a separate scope decision. Tenant administrators cannot change global retention.
- Keep retention settings in private platform configuration, never in the public site-settings response. Configuration changes are audited with safe before/after values. Define and validate defaults and supported bounds during implementation; do not interpret a missing, zero or invalid value as immediate deletion.
- Use a system-owned recurring cleanup job with bounded batches and concurrency protection, independent of editable user task definitions. Determine expiration from event timestamps and the current policy. Record cleanup summaries and failures without creating an event per deleted row; apply the login retention policy to login events and the operation policy to operation events. Existing specialized histories retain their own lifecycle unless explicitly included in the policy.
- Show the effective policy and the deletion consequence before saving a shorter retention period. A longer period cannot restore already deleted records. Database retention does not imply deletion from independent backups or external archives.

### Audit verification

Verify coverage classification, actual success/failure emission, transaction rollback and retry behavior, guard rejection capture, login/logout semantics, list/detail tenant isolation, sensitive-field exclusion, actor snapshots, worker idempotency where applicable, and retention authorization/boundaries/cleanup. Run the existing permission checks when adding audit page/action permissions. Before delivering the implementation, reconcile all current business entry points against the coverage inventory.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---
