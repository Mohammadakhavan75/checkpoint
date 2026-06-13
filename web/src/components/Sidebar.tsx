import { useState } from "react";

import { useCapture, useCreateDomain, useDomains, useItems } from "../api/hooks";
import { STATES } from "../constants";
import type { ItemState, Tab } from "../types";

function AddInput({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <input
      className="addinput"
      autoFocus
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
        else if (e.key === "Escape") onCancel();
      }}
    />
  );
}

export function Sidebar({
  tab,
  domain,
  onNav,
}: {
  tab: Tab;
  domain: string;
  onNav: (tab: Tab, domain?: string) => void;
}) {
  const today = useItems("today");
  const ready = useItems("ready");
  const reservoir = useItems("reservoir");
  const trash = useItems("trash");
  const domains = useDomains();
  const createDomain = useCreateDomain();
  const capture = useCapture();

  const [addingDomain, setAddingDomain] = useState(false);
  const [addingIdea, setAddingIdea] = useState(false);

  return (
    <aside>
      <div className="sect">
        <h4>Execution</h4>
        <button
          className={`navbtn ${tab === "today" ? "on" : ""}`}
          onClick={() => onNav("today")}
        >
          ▸ Today<span className="cnt">{today.data?.length ?? 0}</span>
        </button>
        <button
          className={`navbtn ${tab === "ready" ? "on" : ""}`}
          onClick={() => onNav("ready")}
        >
          ⚑ Ready to GO!<span className="cnt">{ready.data?.length ?? 0}</span>
        </button>
      </div>

      <div className="sect">
        <h4>
          Domains
          <button
            className="addbtn"
            title="Add a domain"
            onClick={() => setAddingDomain((v) => !v)}
          >
            ＋
          </button>
        </h4>
        {addingDomain && (
          <AddInput
            placeholder="new domain name"
            onCancel={() => setAddingDomain(false)}
            onSubmit={(name) => {
              createDomain.mutate(name, { onSuccess: () => onNav("domain", name) });
              setAddingDomain(false);
            }}
          />
        )}
        {(domains.data ?? []).map((d) => (
          <button
            key={d.name}
            className={`navbtn ${tab === "domain" && domain === d.name ? "on" : ""}`}
            onClick={() => onNav("domain", d.name)}
          >
            <span className="dom-dot" />
            {d.name}
            <span className="cnt">{d.count}</span>
          </button>
        ))}
        {!domains.isLoading && (domains.data ?? []).length === 0 && !addingDomain && (
          <div className="sidehint">No domains yet — add one with ＋</div>
        )}
      </div>

      <div className="sect">
        <h4>
          Reservoir
          <button
            className="addbtn"
            title="Add a brain rot"
            onClick={() => setAddingIdea((v) => !v)}
          >
            ＋
          </button>
        </h4>
        {addingIdea && (
          <AddInput
            placeholder="capture an idea"
            onCancel={() => setAddingIdea(false)}
            onSubmit={(text) => {
              capture.mutate(text);
              setAddingIdea(false);
              onNav("reservoir");
            }}
          />
        )}
        <button
          className={`navbtn ${tab === "reservoir" ? "on" : ""}`}
          onClick={() => onNav("reservoir")}
        >
          ~ Brain Rots<span className="cnt">{reservoir.data?.length ?? 0}</span>
        </button>
        <button
          className={`navbtn ${tab === "trash" ? "on" : ""}`}
          onClick={() => onNav("trash")}
        >
          🗑 Trash<span className="cnt">{trash.data?.length ?? 0}</span>
        </button>
      </div>

      <div className="sect">
        <h4>State Legend</h4>
        <div className="legend">
          {(Object.keys(STATES) as ItemState[]).map((k) => (
            <div key={k}>
              <span className="sym" style={{ color: STATES[k].color }}>
                {STATES[k].sym}
              </span>
              {STATES[k].label}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
