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

  // .design-sync/previews/NavButton.tsx
  var NavButton_exports = {};
  __export(NavButton_exports, {
    Domains: () => Domains,
    NavItems: () => NavItems,
    States: () => States
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

  // .design-sync/previews/NavButton.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var frame = { background: "var(--ink)", padding: "14px 0", borderRadius: 12, width: 240 };
  function NavItems() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sect", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Views" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { active: true, count: 3, children: "Today" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { count: 12, children: "Ready to Go" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { children: "Reservoir" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { children: "Trash" })
    ] }) });
  }
  function Domains() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: frame, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sect", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Domains" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { active: true, count: 5, children: "Engineering" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { count: 2, children: "Product" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { count: 1, children: "Design" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { children: "Personal" })
    ] }) });
  }
  function States() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: frame, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { active: true, children: "Active item" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { count: 7, children: "With count" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.NavButton, { children: "Default" })
    ] });
  }
  return __toCommonJS(NavButton_exports);
})();
