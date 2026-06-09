type RitualStepsProps = {
  current: 1 | 2 | 3;
};

const steps = [
  { number: 1, label: "Remember where\nyou stopped" },
  { number: 2, label: "Do the next\nphysical action" },
  { number: 3, label: "Leave a checkpoint\nwhen done" },
] as const;

export function RitualSteps({ current }: RitualStepsProps) {
  return (
    <div className="ritual-steps" aria-label="Start ritual progress">
      {steps.map((step, index) => (
        <div className="ritual-step-wrap" key={step.number}>
          <div className={`ritual-step ${current === step.number ? "active" : ""}`}>
            <span>{step.number}</span>
            <p>{step.label}</p>
          </div>
          {index < steps.length - 1 && <span className="step-line" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
