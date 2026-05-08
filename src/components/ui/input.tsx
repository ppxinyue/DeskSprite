import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[8px] border border-input/80 bg-[var(--surface-raised)] px-2.5 py-1 text-base shadow-[0_1px_0_rgba(255,255,255,0.62)_inset] transition-[background,border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring/55 focus-visible:bg-[var(--glass-bg-strong)] focus-visible:ring-[3px] focus-visible:ring-ring/12",
        "aria-invalid:border-destructive/70 aria-invalid:ring-[3px] aria-invalid:ring-destructive/12",
        className
      )}
      {...props}
    />
  )
}

export { Input }
