export interface ProgressBarProps {
  /** Completion percentage, 0–100 */
  value: number;
}

/** Slim inline progress bar. Wraps `.prog` / `.bar`. */
export function ProgressBar({ value }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="prog">
      <span className="bar" style={{ width: `${pct}%` }} />
    </span>
  );
}
