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

  // .design-sync/previews/Row.tsx
  var Row_exports = {};
  __export(Row_exports, {
    ActiveTask: () => ActiveTask,
    MixedStates: () => MixedStates,
    ResumableTask: () => ResumableTask
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

  // .design-sync/previews/Row.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var frame = { background: "var(--ink)", padding: 20, borderRadius: 12, maxWidth: 620, display: "flex", flexDirection: "column", gap: 10 };
  function ActiveTask() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Row, { state: "active", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Marker, { state: "active" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ttl", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "name", children: "Write API schema for /items endpoint" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Engineering" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ModeChip, { mode: "Do" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Chip, { state: "active" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "acts", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "amber", children: "▸ Start" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { children: "Edit" })
      ] })
    ] }) });
  }
  function ResumableTask() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Row, { state: "active", resumable: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Marker, { state: "active" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ttl", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "name", children: "Refactor auth middleware" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Engineering" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ModeChip, { mode: "Do" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Chip, { state: "active" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "acts", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "amber", children: "⟲ Resume" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { children: "Edit" })
      ] })
    ] }) });
  }
  function MixedStates() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: frame, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Row, { state: "active", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Marker, { state: "active" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ttl", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "name", children: "Design the checkpoint form" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Product" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ModeChip, { mode: "Plan" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Chip, { state: "active" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "acts", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { variant: "amber", children: "▸ Start" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { children: "Edit" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Row, { state: "blocked", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Marker, { state: "blocked" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ttl", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "name", children: "Ship the mobile build" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Engineering" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.ModeChip, { mode: "Do" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Chip, { state: "blocked" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "acts", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { children: "Edit" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ds_exports.Row, { state: "done", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Marker, { state: "done" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ttl", style: { opacity: 0.7 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "name", children: "Set up CI pipeline" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "meta", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "DevOps" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Chip, { state: "done" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "acts", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.Button, { children: "Edit" }) })
      ] })
    ] });
  }
  return __toCommonJS(Row_exports);
})();
