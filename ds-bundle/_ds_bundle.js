/* @ds-bundle: {"namespace":"CheckpointDS","components":[{"name":"Button","sourcePath":"components/general/Button/Button.jsx"},{"name":"Chip","sourcePath":"components/general/Chip/Chip.jsx"},{"name":"ConfirmDialog","sourcePath":"components/general/ConfirmDialog/ConfirmDialog.jsx"},{"name":"EmptyState","sourcePath":"components/general/EmptyState/EmptyState.jsx"},{"name":"Field","sourcePath":"components/general/Field/Field.jsx"},{"name":"Loading","sourcePath":"components/general/Loading/Loading.jsx"},{"name":"Marker","sourcePath":"components/general/Marker/Marker.jsx"},{"name":"Modal","sourcePath":"components/general/Modal/Modal.jsx"},{"name":"ModeChip","sourcePath":"components/general/ModeChip/ModeChip.jsx"},{"name":"NavButton","sourcePath":"components/general/NavButton/NavButton.jsx"},{"name":"ProgressBar","sourcePath":"components/general/ProgressBar/ProgressBar.jsx"},{"name":"ResumeCard","sourcePath":"components/general/ResumeCard/ResumeCard.jsx"},{"name":"Row","sourcePath":"components/general/Row/Row.jsx"},{"name":"SnapCard","sourcePath":"components/general/SnapCard/SnapCard.jsx"},{"name":"TabBar","sourcePath":"components/general/TabBar/TabBar.jsx"}],"sourceHashes":{"components/general/Button/Button.jsx":"1cd7d8971451","components/general/Button/Button.d.ts":"6b56f1f6fb2e","components/general/Button/Button.prompt.md":"f37e09f53001","components/general/Chip/Chip.jsx":"db0f770a5f0c","components/general/Chip/Chip.d.ts":"08120e68b7c7","components/general/Chip/Chip.prompt.md":"62844287c649","components/general/ConfirmDialog/ConfirmDialog.jsx":"935531f3cf10","components/general/ConfirmDialog/ConfirmDialog.d.ts":"d39b8316e84c","components/general/ConfirmDialog/ConfirmDialog.prompt.md":"0cfd21ca815a","components/general/EmptyState/EmptyState.jsx":"d7cb390bb918","components/general/EmptyState/EmptyState.d.ts":"6ccdf76ef66d","components/general/EmptyState/EmptyState.prompt.md":"14763d6e8829","components/general/Field/Field.jsx":"3c78ac0c535e","components/general/Field/Field.d.ts":"630ed3dd0f58","components/general/Field/Field.prompt.md":"60b51f56618b","components/general/Loading/Loading.jsx":"0b520b36823b","components/general/Loading/Loading.d.ts":"cc389a878402","components/general/Loading/Loading.prompt.md":"a0e0c1ee14f4","components/general/Marker/Marker.jsx":"50a1d8cb8568","components/general/Marker/Marker.d.ts":"0fe63ed84d92","components/general/Marker/Marker.prompt.md":"bc3065b97dd8","components/general/Modal/Modal.jsx":"569d87e0f250","components/general/Modal/Modal.d.ts":"9335e94d3c55","components/general/Modal/Modal.prompt.md":"56b40a7b2d63","components/general/ModeChip/ModeChip.jsx":"c3923ea4036c","components/general/ModeChip/ModeChip.d.ts":"b1f37791b49d","components/general/ModeChip/ModeChip.prompt.md":"b9f5b2ff84fe","components/general/NavButton/NavButton.jsx":"866a613a316c","components/general/NavButton/NavButton.d.ts":"ab622a34ea74","components/general/NavButton/NavButton.prompt.md":"a5a4f3ffe3ff","components/general/ProgressBar/ProgressBar.jsx":"71f5ad194e9d","components/general/ProgressBar/ProgressBar.d.ts":"896bf9288d58","components/general/ProgressBar/ProgressBar.prompt.md":"54f53956a393","components/general/ResumeCard/ResumeCard.jsx":"a0806c0af1e9","components/general/ResumeCard/ResumeCard.d.ts":"8671d93b3acc","components/general/ResumeCard/ResumeCard.prompt.md":"75dd73aa6723","components/general/Row/Row.jsx":"2aa554a6ef30","components/general/Row/Row.d.ts":"2d894eaab01a","components/general/Row/Row.prompt.md":"059893068302","components/general/SnapCard/SnapCard.jsx":"810c3e3b1037","components/general/SnapCard/SnapCard.d.ts":"d351ff32e0cc","components/general/SnapCard/SnapCard.prompt.md":"234a26a8e395","components/general/TabBar/TabBar.jsx":"7984a87d6a49","components/general/TabBar/TabBar.d.ts":"ee5f7c4902b5","components/general/TabBar/TabBar.prompt.md":"21db2e1a62f1"},"inlinedExternals":[],"builtBy":"cc-design-sync"} */
"use strict";
var CheckpointDS = (() => {
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

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function jsx16(t, p, k) {
        return R.createElement(t, k === void 0 ? p : Object.assign({ key: k }, p));
      }
      module.exports = R;
      module.exports.jsx = jsx16;
      module.exports.jsxs = jsx16;
      module.exports.jsxDEV = jsx16;
      module.exports.Fragment = R.Fragment;
    }
  });

  // web/ds/dist/index.es.js
  var index_es_exports = {};
  __export(index_es_exports, {
    Button: () => Button,
    Chip: () => Chip,
    ConfirmDialog: () => ConfirmDialog,
    EmptyState: () => EmptyState,
    Field: () => Field,
    Loading: () => Loading,
    MODE_HINTS: () => MODE_HINTS,
    Marker: () => Marker,
    Modal: () => Modal,
    ModeChip: () => ModeChip,
    NavButton: () => NavButton,
    ProgressBar: () => ProgressBar,
    ResumeCard: () => ResumeCard,
    Row: () => Row,
    STATE_CONFIG: () => STATE_CONFIG,
    SnapCard: () => SnapCard,
    TabBar: () => TabBar
  });
  init_define_import_meta_env();
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var import_jsx_runtime2 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime3 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime4 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime5 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime6 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime7 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime8 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime9 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime10 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime11 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime12 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime13 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime14 = __toESM(require_react_shim(), 1);
  var import_jsx_runtime15 = __toESM(require_react_shim(), 1);
  function Button({ variant = "default", className, children, ...props }) {
    const variantClass = variant !== "default" ? variant : "";
    const cls = ["btn", variantClass, className].filter(Boolean).join(" ");
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: cls, ...props, children });
  }
  var STATE_CONFIG = {
    idea: { label: "Idea", color: "var(--faint)", sym: "\xB7" },
    needsdef: { label: "Needs Def", color: "var(--yellow)", sym: "\u25CB" },
    scout: { label: "Scout", color: "var(--cyan)", sym: "?" },
    active: { label: "Active", color: "var(--amber)", sym: "\u25B8" },
    waiting: { label: "Waiting", color: "var(--dim)", sym: "\u2026" },
    blocked: { label: "Blocked", color: "var(--red)", sym: "!" },
    deferred: { label: "Deferred", color: "var(--slate)", sym: "\u2192" },
    killed: { label: "Killed", color: "var(--red)", sym: "\u2715" },
    done: { label: "Done", color: "var(--green)", sym: "\u2713" }
  };
  var MODE_HINTS = {
    Do: "Known, bounded \u2014 execute a clear plan",
    Scout: "Unknown \u2014 explore and map before committing",
    Plan: "Known, unbounded \u2014 break into phases before executing"
  };
  function Chip({ state, label, color }) {
    const s = STATE_CONFIG[state];
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "chip", style: { color: color ?? s.color }, children: label ?? s.label });
  }
  function Marker({ state, symbol, color }) {
    const s = STATE_CONFIG[state];
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "marker", style: { color: color ?? s.color }, children: symbol ?? s.sym });
  }
  function ModeChip({ mode }) {
    if (!mode) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mode-chip", title: MODE_HINTS[mode] ?? `Mode: ${mode}`, children: mode });
  }
  function Field({ label, required, hint, children }) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { children: [
        label,
        required && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "req", children: " *" })
      ] }),
      children,
      hint && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "hint", children: hint })
    ] });
  }
  function Modal({ title, icon, onClose, children, footer, variant = "default" }) {
    const scrimCls = variant === "confirm" ? "scrim confirm-scrim" : "scrim";
    const modalCls = variant === "confirm" ? "modal confirm-modal" : "modal";
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: scrimCls, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: modalCls, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { children: [
        icon && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "ic", children: icon }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { children: title }),
        onClose && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { className: "x", onClick: onClose, "aria-label": "Close", children: "\xD7" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "pad", children }),
      footer && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("footer", { children: footer })
    ] }) });
  }
  function ConfirmDialog({
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default"
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "scrim confirm-scrim", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "modal confirm-modal", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "pad", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "confirm-msg", children: message }) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "footer",
        {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            padding: "14px 22px",
            borderTop: "1px solid var(--line)"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { className: "btn ghost", onClick: onCancel, children: cancelLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                className: `btn ${variant === "danger" ? "danger" : "amber"}`,
                onClick: onConfirm,
                children: confirmLabel
              }
            )
          ]
        }
      )
    ] }) });
  }
  function TabBar({ tabs, active, onChange }) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "tabbar", children: tabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "button",
      {
        className: `tab${active === t.key ? " on" : ""}`,
        onClick: () => onChange(t.key),
        children: t.label
      },
      t.key
    )) });
  }
  function EmptyState({ question, hint, children }) {
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "empty", children: [
      question && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "empty-q", children: question }),
      children,
      hint && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "empty-hint", children: hint })
    ] });
  }
  function Row({
    state,
    resumable,
    variant = "default",
    isNext,
    children,
    animationSlot
  }) {
    const cls = [
      "row",
      animationSlot ? `fade-in s${animationSlot}` : "",
      variant !== "default" ? variant : "",
      state ?? "",
      resumable ? "resumable" : "",
      isNext ? "next" : ""
    ].filter(Boolean).join(" ");
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: cls, children });
  }
  function NavButton({ active, count, children, onClick }) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("button", { className: `navbtn${active ? " on" : ""}`, onClick, children: [
      children,
      count != null && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "cnt", children: count })
    ] });
  }
  function timeAgo(iso) {
    const hasTz = /(?:Z|[+-]\d\d:?\d\d)$/i.test(iso);
    const then = new Date(hasTz ? iso : iso + "Z").getTime();
    const s = Math.max(0, (Date.now() - then) / 1e3);
    if (s < 60) return "moments ago";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  }
  function ResumeCard({ title, checkpoint, onResume, onDismiss }) {
    const cp = checkpoint;
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "resumecard fade-in s1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "rc-top", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "rc-lab", children: "\u27F2 RESUME FROM" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "rc-when", children: timeAgo(cp.created_at) }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Chip, { state: cp.outcome })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "rc-title", children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "rc-state", children: cp.last_state }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "rc-grid", children: [
        cp.resume_from && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "k", children: "Resume from" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "v", children: cp.resume_from })
        ] }),
        cp.next_action && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "k", children: "Next action" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "v", children: cp.next_action })
        ] }),
        cp.do_not_redo && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "k", children: "Do not redo" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "v", children: cp.do_not_redo })
        ] })
      ] }),
      (onResume || onDismiss) && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "rc-acts", children: [
        onResume && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { className: "btn amber rc-resume", onClick: onResume, children: "\u27F2 RESUME" }),
        onDismiss && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { className: "rc-dismiss", onClick: onDismiss, children: "just exploring \u2192" })
      ] })
    ] });
  }
  function SnapCard({ title, children, onEdit, onDelete, editing }) {
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: `snapcard${editing ? " editing" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "snapmain", children: [
        title && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "snaptitle", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "snapnote", children })
      ] }),
      (onEdit || onDelete) && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "snapactions", children: [
        onEdit && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { className: "snapedit", onClick: onEdit, "aria-label": "Edit", children: "\u270E" }),
        onDelete && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { className: "snapdel", onClick: onDelete, "aria-label": "Delete", children: "\xD7" })
      ] })
    ] });
  }
  function ProgressBar({ value }) {
    const pct = Math.max(0, Math.min(100, value));
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "prog", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "bar", style: { width: `${pct}%` } }) });
  }
  function Loading() {
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "loading", children: "loading\u2026" });
  }
  return __toCommonJS(index_es_exports);
})();
window.CheckpointDS=CheckpointDS.__dsMainNs?Object.assign({},CheckpointDS,CheckpointDS.__dsMainNs,{__dsMainNs:undefined}):CheckpointDS;
