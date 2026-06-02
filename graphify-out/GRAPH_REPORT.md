# Graph Report - .  (2026-06-02)

## Corpus Check
- Corpus is ~30,356 words - fits in a single context window. You may not need a graph.

## Summary
- 610 nodes · 1564 edges · 56 communities (35 shown, 21 thin omitted)
- Extraction: 66% EXTRACTED · 34% INFERRED · 0% AMBIGUOUS · INFERRED: 532 edges (avg confidence: 0.53)
- Token cost: 224,888 input · 96,379 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Checkpoint Domain Service|Checkpoint Domain Service]]
- [[_COMMUNITY_Identity Sessions & Tokens|Identity Sessions & Tokens]]
- [[_COMMUNITY_AI Change Records|AI Change Records]]
- [[_COMMUNITY_API Gateway Proxy|API Gateway Proxy]]
- [[_COMMUNITY_Obsidian Core Plugins|Obsidian Core Plugins]]
- [[_COMMUNITY_Obsidian Workspace Config|Obsidian Workspace Config]]
- [[_COMMUNITY_Web NPM Dependencies|Web NPM Dependencies]]
- [[_COMMUNITY_Architecture & Invariants Docs|Architecture & Invariants Docs]]
- [[_COMMUNITY_Web App Shell & API Client|Web App Shell & API Client]]
- [[_COMMUNITY_MissionRitual Components|Mission/Ritual Components]]
- [[_COMMUNITY_Obsidian Graph Config|Obsidian Graph Config]]
- [[_COMMUNITY_TS App Compiler Config|TS App Compiler Config]]
- [[_COMMUNITY_AI Change Governance|AI Change Governance]]
- [[_COMMUNITY_ParkingMissions Unification|Parking/Missions Unification]]
- [[_COMMUNITY_Docker Compose Stack|Docker Compose Stack]]
- [[_COMMUNITY_Mission Snapshot Page|Mission Snapshot Page]]
- [[_COMMUNITY_Identity Auth & Hashing|Identity Auth & Hashing]]
- [[_COMMUNITY_Settings & Active-Set Cap|Settings & Active-Set Cap]]
- [[_COMMUNITY_TS Node Compiler Config|TS Node Compiler Config]]
- [[_COMMUNITY_Repository Map & Subsystems|Repository Map & Subsystems]]
- [[_COMMUNITY_Auth Page & Routing|Auth Page & Routing]]
- [[_COMMUNITY_Files Index Schema|Files Index Schema]]
- [[_COMMUNITY_Symbols Index Schema|Symbols Index Schema]]
- [[_COMMUNITY_Access Token Decoding|Access Token Decoding]]
- [[_COMMUNITY_Checkpoint DB Layer|Checkpoint DB Layer]]
- [[_COMMUNITY_Web BuildTest Config|Web Build/Test Config]]
- [[_COMMUNITY_Identity DB Layer|Identity DB Layer]]
- [[_COMMUNITY_Root TS Config|Root TS Config]]
- [[_COMMUNITY_Coding Guidelines|Coding Guidelines]]
- [[_COMMUNITY_Distributed-host service domains|Distributed-host service domains]]
- [[_COMMUNITY_change-history.example.json|change-history.example.json]]
- [[_COMMUNITY_test-map.example.json|test-map.example.json]]
- [[_COMMUNITY_AI Agent Operating Rules|AI Agent Operating Rules]]
- [[_COMMUNITY_API Gateway requirements|API Gateway requirements]]
- [[_COMMUNITY_API Gateway security|API Gateway security]]
- [[_COMMUNITY_Checkpoint service requirements|Checkpoint service requirements]]
- [[_COMMUNITY_Context Packs README|Context Packs README]]
- [[_COMMUNITY_email-validator|email-validator]]
- [[_COMMUNITY_fastapi|fastapi]]
- [[_COMMUNITY_httpx|httpx]]
- [[_COMMUNITY_psycopg|psycopg]]
- [[_COMMUNITY_pytest|pytest]]
- [[_COMMUNITY_redis|redis]]
- [[_COMMUNITY_sqlalchemy|sqlalchemy]]
- [[_COMMUNITY_uvicorn|uvicorn]]
- [[_COMMUNITY_Concurrency Invariants|Concurrency Invariants]]
- [[_COMMUNITY_Subsystem Example Template|Subsystem: Example Template]]

## God Nodes (most connected - your core abstractions)
1. `Base` - 46 edges
2. `str` - 41 edges
3. `Session` - 39 edges
4. `str` - 27 edges
5. `MissionOut` - 25 edges
6. `Mission` - 25 edges
7. `Checkpoint` - 23 edges
8. `str` - 23 edges
9. `Preference` - 23 edges
10. `passthrough_json()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `set_auth_cookies` --semantically_similar_to--> `Security Invariants`  [INFERRED] [semantically similar]
  services/api-gateway/app/main.py → docs/invariants/security.md
- `user_id_from_request` --semantically_similar_to--> `Security Invariants`  [INFERRED] [semantically similar]
  services/api-gateway/app/main.py → docs/invariants/security.md
- `checkpoint_request proxy` --semantically_similar_to--> `API Compatibility Invariants`  [INFERRED] [semantically similar]
  services/api-gateway/app/main.py → docs/invariants/api-compatibility.md
- `decode_access_token` --semantically_similar_to--> `Fail-closed authorization`  [INFERRED] [semantically similar]
  services/api-gateway/app/security.py → docs/invariants/security.md
- `Subsystem: Identity` --references--> `issue_tokens()`  [INFERRED]
  ai/context/subsystem-identity.md → services/identity-service/app/main.py

## Import Cycles
- 1-file cycle: `services/checkpoint-service/app/models.py -> services/checkpoint-service/app/models.py`
- 1-file cycle: `services/identity-service/app/models.py -> services/identity-service/app/models.py`

## Hyperedges (group relationships)
- **Checkpoint Microservice Stack** — web_app, api_gateway, identity_service, checkpoint_service, docker_compose_local_stack [EXTRACTED 0.85]
- **HttpOnly Cookie Auth and User-Scoping Flow** — httponly_cookie_auth, x_user_id_forwarding, user_scoped_isolation, internal_header_trust [INFERRED 0.85]
- **Parking/Mission Convergence Work** — parking_consistency, parking_mission_unification, delete_mission_endpoint, today_composition [INFERRED 0.75]
- **Start/Stop ritual continuity flow** — pages_todaypage, pages_stopcheckpointpage, pages_missionsnapshotpage, lib_types_todaypayload [INFERRED 0.75]
- **Parking and missions unified data flow** — pages_parkingpage, pages_lifeindexpage, lib_types_mission, lib_types_parkingitem [INFERRED 0.75]
- **Active Mission Limit Coordination** — app_main_create_mission, app_main_active_missions, app_main_next_free_rank, app_main_activate_mission [EXTRACTED 0.75]
- **Token Issuance and Auth Flow** — app_main_issue_tokens, app_security_create_access_token, app_main_session_store, app_schemas_authresponse [EXTRACTED 0.75]
- **Checkpoint Resume Field Composition** — app_main_create_checkpoint, app_models_mission, app_models_checkpoint [EXTRACTED 0.75]
- **Checkpoint container service topology** — compose_web, compose_api_gateway, compose_identity_service, compose_checkpoint_service, compose_postgres [EXTRACTED 1.00]
- **AI change governance pipeline** — agents, pre_commit_config, scripts_check_ai_change_policy, scripts_ai_new_task [INFERRED 0.85]
- **Web app bootstrap and routing** — main, app, components_appshell [EXTRACTED 1.00]
- **Active-set cap enforcement** — plans_gap_closure_active_set_cap, tests_test_checkpoint, task_0005_plan [INFERRED 0.75]
- **Gateway cookie auth flow** — api_gateway_main_user_id_from_request, api_gateway_security_decode_access_token, invariants_security_failclosed [INFERRED 0.75]
- **Distributed deployment config** — deployment_distributed_hosts, architecture_index, task_0006_plan [INFERRED 0.75]

## Communities (56 total, 21 thin omitted)

### Community 0 - "Checkpoint Domain Service"
Cohesion: 0.18
Nodes (66): identity get_db, checkpoint activate_mission, _active_missions(), checkpoint create_checkpoint, checkpoint create_mission, delete_domain(), delete_mission(), demote_mission() (+58 more)

### Community 1 - "Identity Sessions & Tokens"
Cohesion: 0.18
Nodes (49): get_user(), issue_tokens(), identity logout, make_store(), MemorySessionStore, preference_out(), refresh(), resolve_user() (+41 more)

### Community 2 - "AI Change Records"
Cohesion: 0.06
Nodes (48): Active Mission Limit Enforcement, ADHD-Friendly Minimalist UI, API Gateway, Bcrypt Password Hashing via Passlib, AI Change: Docker Infrastructure, AI Change: Identity Service, AI Change: Checkpoint Domain Service, AI Change: API Gateway (+40 more)

### Community 3 - "API Gateway Proxy"
Cohesion: 0.24
Nodes (36): checkpoint_request(), clear_auth_cookies(), identity_get(), me(), passthrough_json(), read_json(), set_auth_cookies(), user_id_from_request() (+28 more)

### Community 4 - "Obsidian Core Plugins"
Cohesion: 0.06
Nodes (31): audio-recorder, backlink, bases, bookmarks, canvas, command-palette, daily-notes, editor-status (+23 more)

### Community 5 - "Obsidian Workspace Config"
Cohesion: 0.07
Nodes (29): active, bases:Create new base, canvas:Create new canvas, command-palette:Open command palette, daily-notes:Open today's daily note, graph:Open graph view, switcher:Open quick switcher, templates:Insert template (+21 more)

### Community 6 - "Web NPM Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, lucide-react, react, react-dom, react-router-dom, @vitejs/plugin-react, devDependencies, jsdom (+20 more)

### Community 7 - "Architecture & Invariants Docs"
Cohesion: 0.10
Nodes (24): ADR-000 template, API Gateway main, checkpoint_request proxy, set_auth_cookies, user_id_from_request, decode_access_token, Architecture Index, Distributed Host Deployment (+16 more)

### Community 8 - "Web App Shell & API Client"
Cohesion: 0.14
Nodes (19): App Router, navItems, Context Pack 001 Dark Mode, api, AuthPayload, RequestOptions, AuthContext, AuthProvider() (+11 more)

### Community 9 - "Mission/Ritual Components"
Cohesion: 0.14
Nodes (14): MissionCreateForm(), Props, QuietField(), QuietFieldProps, RitualSteps(), RitualStepsProps, steps, Start Ritual (+6 more)

### Community 10 - "Obsidian Graph Config"
Cohesion: 0.10
Nodes (20): centerStrength, close, collapse-color-groups, collapse-display, collapse-filter, collapse-forces, colorGroups, hideUnresolved (+12 more)

### Community 11 - "TS App Compiler Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 12 - "AI Change Governance"
Cohesion: 0.21
Nodes (15): Mandatory AI change workflow, Preserve codebase understandability, AI change policy pre-commit hook, Pre-commit Config, changed_files(), files_under(), has_changed_under(), main() (+7 more)

### Community 13 - "Parking/Missions Unification"
Cohesion: 0.25
Nodes (11): Parking/Missions unification, Context Pack 002 Parking Missions, Context Pack TASK-0002 Parking Consistency, Domain, Mission, ParkingItem, LifeIndexPage(), parkingItem (+3 more)

### Community 14 - "Docker Compose Stack"
Cohesion: 0.22
Nodes (14): Checkpoint continuity app concept, api-gateway container, checkpoint-service container, identity-service container, postgres service, redis service, web container, Docker Compose Stack (+6 more)

### Community 15 - "Mission Snapshot Page"
Cohesion: 0.20
Nodes (10): Context Pack 004 Gap Closure M1 Mission Snapshot, Checkpoint, CheckpointRow, CheckpointRow(), MissionSnapshotPage(), relativeTime(), SNAPSHOT_FIELDS, StringMissionKey (+2 more)

### Community 16 - "Identity Auth & Hashing"
Cohesion: 0.29
Nodes (12): identity login, identity signup, _b64url(), create_access_token(), hash_password(), verify_password(), Any, _b64url_decode() (+4 more)

### Community 17 - "Settings & Active-Set Cap"
Cohesion: 0.17
Nodes (9): Active-set cap (3 active missions), Context Pack 003 Logout Position, Context Pack 005 Gap Closure M2-M5, Context Pack 006 Merge Fix Logout and Gap Closure, ApiError, request(), DomainRow, InlineField (+1 more)

### Community 18 - "TS Node Compiler Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 19 - "Repository Map & Subsystems"
Cohesion: 0.24
Nodes (10): Repository Map, Checkpoint App (ADHD continuity MVP), Critical Invariants, Subsystem: API Gateway, Subsystem: Checkpoint Domain, Subsystem: Identity, Subsystem: Web, Start Ritual (+2 more)

### Community 20 - "Auth Page & Routing"
Cohesion: 0.43
Nodes (6): AppShell(), ApiError, useAuth(), AuthPage(), AuthPageProps, Protected()

### Community 21 - "Files Index Schema"
Cohesion: 0.25
Nodes (7): example/path/file.ext, adrs, invariants, last_reviewed, subsystem, summary, tests

### Community 22 - "Symbols Index Schema"
Cohesion: 0.25
Nodes (7): ExampleClass.exampleMethod, callees, callers, defined_in, invariants, responsibility, tests

### Community 23 - "Access Token Decoding"
Cohesion: 0.47
Nodes (5): Any, _b64url_decode(), decode_access_token(), bytes, str

### Community 24 - "Checkpoint DB Layer"
Cohesion: 0.40
Nodes (4): DeclarativeBase, Base, get_db(), Session

### Community 25 - "Web Build/Test Config"
Cohesion: 0.50
Nodes (4): web package.json, Playwright Config, Testing Guidelines, Vite Config

## Knowledge Gaps
- **212 isolated node(s):** `file-explorer`, `global-search`, `switcher`, `graph`, `backlink` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Base` connect `Identity Sessions & Tokens` to `Checkpoint Domain Service`, `Checkpoint DB Layer`, `Identity DB Layer`, `Architecture & Invariants Docs`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `str` connect `Architecture & Invariants Docs` to `Identity Sessions & Tokens`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Are the 44 inferred relationships involving `Base` (e.g. with `MemorySessionStore` and `SessionStore`) actually correct?**
  _`Base` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `str` (e.g. with `Checkpoint` and `Domain`) actually correct?**
  _`str` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `Session` (e.g. with `Checkpoint` and `Domain`) actually correct?**
  _`Session` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `MissionOut` (e.g. with `Checkpoint` and `Domain`) actually correct?**
  _`MissionOut` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `file-explorer`, `global-search`, `switcher` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._