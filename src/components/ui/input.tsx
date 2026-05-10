import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[10px] border border-input/75 bg-[var(--surface-raised)] px-4 py-1 text-[13px] leading-5 font-normal shadow-[0_1px_0_rgba(255,255,255,0.68)_inset,0_8px_22px_rgba(52,64,84,0.045)] transition-[background,border-color,box-shadow,opacity] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-white/28 read-only:text-muted-foreground read-only:shadow-[0_1px_0_rgba(255,255,255,0.44)_inset] dark:read-only:bg-white/[0.045]",
        "focus-visible:border-ring/55 focus-visible:bg-[var(--glass-bg-strong)] focus-visible:ring-[3px] focus-visible:ring-ring/12",
        "aria-invalid:border-destructive/70 aria-invalid:ring-[3px] aria-invalid:ring-destructive/12",
        className
      )}
      {...props}
    />
  )
}

export { Input }
