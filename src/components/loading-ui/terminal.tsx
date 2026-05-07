import { cn } from "@/lib/utils";

interface TerminalProps {
  prompt?: string;
  className?: string;
  duration?: string;
}

export function Terminal({ prompt = "$", className, duration = "1s" }: TerminalProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-mono text-[13px] leading-[1.5]", className)}
      style={{ "--duration": duration } as React.CSSProperties}
      role="status"
      aria-label="模型正在回复"
    >
      <span>{prompt}</span>
      <span className="terminal-cursor inline-block h-[1em] w-[0.58em] translate-y-[0.12em] bg-current" />
    </span>
  );
}
