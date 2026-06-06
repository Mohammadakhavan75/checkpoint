import { useItems } from "../api/hooks";
import { DOMAINS, STATES } from "../constants";
import type { ItemState, Tab } from "../types";

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
  // DOMAINS is a constant-length array, so this map calls hooks in a stable order.
  const domainData = DOMAINS.map((d) => useItems("domain", d));

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
        <h4>Domains</h4>
        {DOMAINS.map((d, i) => (
          <button
            key={d}
            className={`navbtn ${tab === "domain" && domain === d ? "on" : ""}`}
            onClick={() => onNav("domain", d)}
          >
            <span className="dom-dot" />
            {d}
            <span className="cnt">{domainData[i].data?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="sect">
        <h4>Reservoir</h4>
        <button
          className={`navbtn ${tab === "reservoir" ? "on" : ""}`}
          onClick={() => onNav("reservoir")}
        >
          ~ Brain Rots<span className="cnt">{reservoir.data?.length ?? 0}</span>
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
