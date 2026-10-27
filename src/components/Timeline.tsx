export function Timeline({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol aria-label="Progress" className="my-4 grid grid-cols-4 gap-2 text-xs">
      {stages.map((stage, index) => (
        <li
          key={stage}
          aria-current={index === current ? "step" : undefined}
          className={
            index <= current
              ? "border-t-4 border-accent pt-2 text-foreground"
              : "border-t-4 border-border pt-2 text-muted-foreground"
          }
        >
          <span className="block font-mono">{index < current ? "✓" : `0${index + 1}`}</span>
          {stage}
        </li>
      ))}
    </ol>
  );
}
