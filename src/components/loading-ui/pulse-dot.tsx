import { cn } from "@/lib/utils";

interface PulseDotProps {
  className?: string;
  duration?: string;
}

export function PulseDot({ className, duration = "1.2s" }: PulseDotProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 leading-[1.5]", className)}
      style={{ "--duration": duration } as React.CSSProperties}
      role="status"
      aria-label="模型正在回复"
    >
      <span className="pulse-dot inline-block size-2 rounded-full bg-current" />
      <span>Generating...</span>
    </span>
  );
}
