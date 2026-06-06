export default function FoxMark({
  label = "Fox guide",
  compact = false,
  className = "",
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={label}
    >
      <span className="fox-mark" aria-hidden="true">
        <span className="fox-ear fox-ear-left" />
        <span className="fox-ear fox-ear-right" />
        <span className="fox-eye fox-eye-left" />
        <span className="fox-eye fox-eye-right" />
        <span className="fox-muzzle" />
        <span className="fox-nose" />
      </span>
      {!compact && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
          {label}
        </span>
      )}
    </span>
  );
}
