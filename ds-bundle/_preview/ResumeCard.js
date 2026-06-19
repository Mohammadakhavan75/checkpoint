var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.CheckpointDS;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function jsx2(t, p, k) {
        return R.createElement(t, k === void 0 ? p : Object.assign({ key: k }, p));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsx2;
      module.exports.jsxDEV = jsx2;
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/ResumeCard.tsx
  var ResumeCard_exports = {};
  __export(ResumeCard_exports, {
    DoneCheckpoint: () => DoneCheckpoint,
    WithResume: () => WithResume
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.CheckpointDS;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/ResumeCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var frame = { background: "var(--ink)", padding: 20, borderRadius: 12, maxWidth: 600 };
  var twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString();
  var yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  function WithResume() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ResumeCard,
      {
        title: "Refactor auth middleware",
        checkpoint: {
          outcome: "active",
          last_state: "Working through the token refresh logic — got the middleware skeleton done",
          resume_from: "src/auth/refresh.ts line 47 — the conditional expiry check",
          next_action: "Add the sliding window logic and write the unit test",
          do_not_redo: "Do not touch the existing token generation — it works correctly",
          created_at: twoHoursAgo
        },
        onResume: () => {
        },
        onDismiss: () => {
        }
      }
    ) });
  }
  function DoneCheckpoint() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ds_exports.ResumeCard,
      {
        title: "Write API schema for /items endpoint",
        checkpoint: {
          outcome: "done",
          last_state: "Schema complete — all fields documented and validated with the team",
          do_not_redo: "Do not add optional fields without a design review first",
          created_at: yesterday
        }
      }
    ) });
  }
  return __toCommonJS(ResumeCard_exports);
})();
