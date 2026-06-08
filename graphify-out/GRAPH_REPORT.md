# Graph Report - .  (2026-06-08)

## Corpus Check
- 81 files · ~86,549 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 713 nodes · 2095 edges · 38 communities (31 shown, 7 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 209 edges (avg confidence: 0.79)
- Token cost: 225,877 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Minified StackEdit Bundle|Minified StackEdit Bundle]]
- [[_COMMUNITY_TanStack Query Hooks|TanStack Query Hooks]]
- [[_COMMUNITY_API RequestResponse Types|API Request/Response Types]]
- [[_COMMUNITY_Frontend API Client|Frontend API Client]]
- [[_COMMUNITY_Item & Snapshot Endpoints|Item & Snapshot Endpoints]]
- [[_COMMUNITY_Checkpoint Resume Logic|Checkpoint Resume Logic]]
- [[_COMMUNITY_Google Auth & Test Fixtures|Google Auth & Test Fixtures]]
- [[_COMMUNITY_Snapshot Service Layer|Snapshot Service Layer]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Web Package Manifest|Web Package Manifest]]
- [[_COMMUNITY_Domain Registry|Domain Registry]]
- [[_COMMUNITY_Auth Endpoints|Auth Endpoints]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_FastAPI App Infrastructure|FastAPI App Infrastructure]]
- [[_COMMUNITY_SQLAlchemy Data Models|SQLAlchemy Data Models]]
- [[_COMMUNITY_Architecture Concepts & Rationale|Architecture Concepts & Rationale]]
- [[_COMMUNITY_StackEdit Worker Bundle (055)|StackEdit Worker Bundle (055)]]
- [[_COMMUNITY_StackEdit Worker Bundle (4465)|StackEdit Worker Bundle (4465)]]
- [[_COMMUNITY_TS Node Config|TS Node Config]]
- [[_COMMUNITY_StackEdit App Bundle|StackEdit App Bundle]]
- [[_COMMUNITY_App Settings & Providers|App Settings & Providers]]
- [[_COMMUNITY_Alembic Migration Runner|Alembic Migration Runner]]
- [[_COMMUNITY_Domain Tests|Domain Tests]]
- [[_COMMUNITY_AI Assist Stub|AI Assist Stub]]
- [[_COMMUNITY_Vendored StackEdit Decision|Vendored StackEdit Decision]]
- [[_COMMUNITY_VSCode Launch Config|VSCode Launch Config]]
- [[_COMMUNITY_Vite Env Types|Vite Env Types]]
- [[_COMMUNITY_TS Project Config|TS Project Config]]
- [[_COMMUNITY_API Entrypoint Script|API Entrypoint Script]]
- [[_COMMUNITY_Session Presets|Session Presets]]
- [[_COMMUNITY_SPA HTML Entry|SPA HTML Entry]]

## God Nodes (most connected - your core abstractions)
1. `_()` - 132 edges
2. `a()` - 56 edges
3. `i()` - 46 edges
4. `s()` - 42 edges
5. `o()` - 36 edges
6. `b()` - 36 edges
7. `u()` - 35 edges
8. `h()` - 34 edges
9. `r()` - 33 edges
10. `E()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Checkpoint (resume receipt) concept` --semantically_similar_to--> `Checkpoint`  [INFERRED] [semantically similar]
  docs/architecture/FINAL_ARCHITECTURE.md → web/src/types.ts
- `brain_os.html terminal/cockpit prototype` --semantically_similar_to--> `QUAD / CLASS_MODE compile matrix`  [INFERRED] [semantically similar]
  brain_os.html → web/src/constants.ts
- `Block-tree data model (items/containers/phases)` --conceptually_related_to--> `Item`  [INFERRED]
  docs/architecture/FINAL_ARCHITECTURE.md → web/src/types.ts
- `AI hooks seam (stubbed /api/ai, SSE, pgvector)` --conceptually_related_to--> `Checkpoint`  [INFERRED]
  docs/architecture/FINAL_ARCHITECTURE.md → web/src/types.ts
- `Append-only checkpoints decision` --rationale_for--> `Checkpoint`  [INFERRED]
  docs/architecture/FINAL_ARCHITECTURE.md → web/src/types.ts

## Import Cycles
- 1-file cycle: `api/app/main.py -> api/app/main.py`

## Hyperedges (group relationships)
- **JWT password auth flow** — api_auth_login, app_auth_verify_password, app_auth_create_access_token, app_auth_get_current_user [INFERRED 0.85]
- **Checkpoint create/persist flow** — api_checkpoints_create_checkpoint, services_checkpoints_save_checkpoint, app_models_checkpoint, app_schemas_checkpointcreate [INFERRED 0.85]
- **Item serialization to response** — api_serializers_serialize_item, app_models_item, app_schemas_itemout, services_checkpoints_latest_checkpoint [INFERRED 0.75]
- **Alembic linear migration revision chain** — versions_0001_initial, versions_0002_google_auth, versions_0003_user_profile, versions_0004_domains, versions_0005_snapshots, versions_0006_remove_snapshot_url [EXTRACTED 1.00]
- **compile_item builds container by reconciling phases and rolling up state** — services_items_compile_item, services_items_reconcile_phases, services_items_rollup [EXTRACTED 1.00]
- **Vendored StackEdit offline editor assets** — stackedit_055bfb9ab79653ee7258_worker, stackedit_4465ef46f616032afa20_worker, js_app_d8278d78a34d17a25140, js_manifest_45162e7d88d5246d902f, js_vendor_745129a72af4c802d961, stackedit_sw [INFERRED 0.85]
- **App-orchestrated modal/overlay workflow** — src_app_app, components_compilemodal_compilemodal, components_sessionoverlay_sessionoverlay, components_checkpointmodal_checkpointmodal [INFERRED 0.85]
- **Five-screen app flow (Today / Ready / Domain / Reservoir)** — views_todayview_todayview, views_readyview_readyview, views_domainview_domainview, views_reservoirview_reservoirview, views_authview_authview [INFERRED 0.85]
- **Docker Compose runtime stack** — docker_compose_stack, index_runtime_topology, readme_overview [INFERRED 0.75]
- **TanStack Query data layer over typed client** — api_client_apiclient, api_hooks_hooks, src_types_item, src_main_main [INFERRED 0.85]

## Communities (38 total, 7 thin omitted)

### Community 0 - "Minified StackEdit Bundle"
Cohesion: 0.10
Nodes (121): _(), a(), ae(), an(), ar(), at(), b(), be() (+113 more)

### Community 1 - "TanStack Query Hooks"
Cohesion: 0.06
Nodes (67): API fetch client (client.ts), TanStack Query hooks (hooks.ts), useCapture(), useCompile(), useCreateDomain(), useDeleteItem(), useDeleteSnapshot(), useDomains() (+59 more)

### Community 2 - "API Request/Response Types"
Cohesion: 0.07
Nodes (73): AsyncSession, CompileRequest, Item, ItemOut, str, User, UUID, bool (+65 more)

### Community 3 - "Frontend API Client"
Cohesion: 0.11
Nodes (30): ApiError, body(), captureItem(), compileItem(), createCheckpoint(), createDomain(), createSnapshot(), deleteItem() (+22 more)

### Community 4 - "Item & Snapshot Endpoints"
Cohesion: 0.12
Nodes (28): Item endpoints: list (view filters), CRUD, capture, promote, compile, state, dai, Helpers to assemble ORM rows into ItemOut/CheckpointOut response models., Snapshot endpoints: list (newest first), append, and delete.  A snapshot is free, Item, CLASS_MODE mapping, CaptureRequest, CheckpointCreate, CheckpointOut (+20 more)

### Community 5 - "Checkpoint Resume Logic"
Cohesion: 0.11
Nodes (22): AsyncSession, CheckpointCreate, User, UUID, AsyncSession, Checkpoint, CheckpointCreate, Item (+14 more)

### Community 6 - "Google Auth & Test Fixtures"
Cohesion: 0.10
Nodes (23): AsyncSession, str, User, app.api.auth google route, bool, str, hash_password(), Exception (+15 more)

### Community 7 - "Snapshot Service Layer"
Cohesion: 0.15
Nodes (26): AsyncSession, SnapshotCreate, SnapshotUpdate, User, UUID, AsyncSession, Item, SnapshotCreate (+18 more)

### Community 8 - "Database Migrations"
Cohesion: 0.10
Nodes (4): Checkpoint model, Domain model, Item model, Snapshot model

### Community 9 - "Web Package Manifest"
Cohesion: 0.09
Nodes (21): dependencies, marked, react, react-dom, stackedit-js, @tanstack/react-query, devDependencies, @types/node (+13 more)

### Community 10 - "Domain Registry"
Cohesion: 0.14
Nodes (18): AsyncSession, User, AsyncSession, str, UUID, create_domain(), get_domains(), Domain endpoints: list (with counts) and create. (+10 more)

### Community 11 - "Auth Endpoints"
Cohesion: 0.16
Nodes (19): AsyncSession, User, AsyncSession, bool, str, User, google_login(), login() (+11 more)

### Community 12 - "TypeScript App Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 13 - "FastAPI App Infrastructure"
Cohesion: 0.16
Nodes (12): AsyncSession, str, Checkpoint endpoints: history (newest first) and append., JWT auth: password hashing, token creation, current-user dependency., Application configuration via pydantic-settings (env vars)., get_session(), Async SQLAlchemy engine + session dependency., FastAPI dependency yielding a session; rolls back on error. (+4 more)

### Community 14 - "SQLAlchemy Data Models"
Cohesion: 0.26
Nodes (14): Base, Checkpoint, Domain, Item, SQLAlchemy models: User, Item, Checkpoint.  The data is block-tree shaped: an It, Append-only history. Never UPDATE or DELETE a checkpoint row., Freeform context the user attaches to an item: a note and/or a link,     kept wi, A user's custom domain (the sidebar categories). Items reference a domain     by (+6 more)

### Community 15 - "Architecture Concepts & Rationale"
Cohesion: 0.13
Nodes (17): brain_os.html terminal/cockpit prototype, QUAD / CLASS_MODE compile matrix, Docker Compose stack (postgres, api, web), AI hooks seam (stubbed /api/ai, SSE, pgvector), Append-only checkpoints decision, Block-tree data model (items/containers/phases), Checkpoint (resume receipt) concept, Compile matrix (procedure x scope) (+9 more)

### Community 16 - "StackEdit Worker Bundle (055)"
Cohesion: 0.20
Nodes (11): a(), c(), f(), i(), l(), n(), o(), p() (+3 more)

### Community 17 - "StackEdit Worker Bundle (4465)"
Cohesion: 0.20
Nodes (11): a(), c(), f(), i(), l(), n(), o(), p() (+3 more)

### Community 18 - "TS Node Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 19 - "StackEdit App Bundle"
Cohesion: 0.64
Nodes (10): a(), c(), e(), i(), n(), o(), r(), s() (+2 more)

### Community 20 - "App Settings & Providers"
Cohesion: 0.20
Nodes (9): bool, str, str, providers(), Which sign-in methods are available (lets the client show the Google button)., Settings, async engine, FastAPI app (+1 more)

### Community 21 - "Alembic Migration Runner"
Cohesion: 0.40
Nodes (3): _do_run_migrations(), Alembic environment — async engine, URL from app settings., run_migrations_online()

### Community 23 - "AI Assist Stub"
Cohesion: 0.50
Nodes (3): AI router — stubbed (501) for now. Clean seam; do not implement until core works, resume_summary(), UUID

### Community 24 - "Vendored StackEdit Decision"
Cohesion: 0.67
Nodes (4): .claude launch config (web), Vendored offline StackEdit editor decision, Vendored StackEdit offline build, Vite config + stackedit-fallback middleware

## Knowledge Gaps
- **112 isolated node(s):** `version`, `configurations`, `str`, `bool`, `UserCreate` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SnapshotModal()` connect `TanStack Query Hooks` to `StackEdit App Bundle`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `_()` connect `Minified StackEdit Bundle` to `StackEdit Worker Bundle (055)`, `StackEdit Worker Bundle (4465)`, `StackEdit App Bundle`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `r()` connect `StackEdit App Bundle` to `Minified StackEdit Bundle`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `_()` (e.g. with `r()` and `o()`) actually correct?**
  _`_()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `version`, `configurations`, `AI router — stubbed (501) for now. Clean seam; do not implement until core works` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Minified StackEdit Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.0952263779527559 - nodes in this community are weakly interconnected._
- **Should `TanStack Query Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.06153846153846154 - nodes in this community are weakly interconnected._