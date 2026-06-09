import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { ApiError, api } from "../lib/api";
import type { Domain } from "../lib/types";

type Props = {
  defaultStatus: "active" | "parked";
  onSuccess: () => void;
};

export function MissionCreateForm({ defaultStatus, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [domainId, setDomainId] = useState("");
  const [whyMatters, setWhyMatters] = useState("");
  const [successCondition, setSuccessCondition] = useState("");
  const [doNotRethink, setDoNotRethink] = useState("");
  const [showMore, setShowMore] = useState(() => sessionStorage.getItem("mission-form-expanded") === "1");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.domains().then(setDomains).catch(() => {});
  }, []);

  function toggleMore() {
    setShowMore((prev) => {
      const next = !prev;
      sessionStorage.setItem("mission-form-expanded", next ? "1" : "0");
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createMission({
        title,
        status: defaultStatus,
        domain_id: domainId || undefined,
        next_action: nextAction || undefined,
        why_matters: whyMatters || undefined,
        success_condition: successCondition || undefined,
        do_not_rethink: doNotRethink || undefined,
      } as Parameters<typeof api.createMission>[0]);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create mission");
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = defaultStatus === "active" ? "Create active mission" : "Park for later";

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>
        Mission
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finish anomaly detection direction" required />
      </label>
      <label>
        Next physical action
        <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Open roadmap.md and write the first section" />
      </label>
      {domains.length > 0 && (
        <label>
          Domain
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            <option value="">No domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button className="more-context-toggle" type="button" onClick={toggleMore} aria-expanded={showMore}>
        {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        More context (optional)
      </button>

      {showMore && (
        <div className="more-context-fields">
          <label>
            Why this matters
            <textarea value={whyMatters} onChange={(e) => setWhyMatters(e.target.value)} placeholder="What breaks if this never gets done?" rows={2} />
          </label>
          <label>
            Success condition
            <textarea value={successCondition} onChange={(e) => setSuccessCondition(e.target.value)} placeholder="What does done look like, concretely?" rows={2} />
          </label>
          <label>
            Do not rethink
            <textarea value={doNotRethink} onChange={(e) => setDoNotRethink(e.target.value)} placeholder="What decision is already made and should not be reopened?" rows={2} />
          </label>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {buttonLabel}
      </button>
    </form>
  );
}
