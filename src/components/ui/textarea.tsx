import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-14 w-full rounded-[10px] border border-input/75 bg-[var(--surface-raised)] px-4 py-2 text-[13px] leading-5 font-normal shadow-[0_1px_0_rgba(255,255,255,0.68)_inset,0_8px_22px_rgba(52,64,84,0.045)] transition-[background,border-color,box-shadow,opacity] outline-none placeholder:text-muted-foreground focus-visible:border-ring/55 focus-visible:bg-[var(--glass-bg-strong)] focus-visible:ring-[3px] focus-visible:ring-ring/12 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-white/28 read-only:text-muted-foreground read-only:shadow-[0_1px_0_rgba(255,255,255,0.44)_inset] dark:read-only:bg-white/[0.045] aria-invalid:border-destructive/70 aria-invalid:ring-[3px] aria-invalid:ring-destructive/12",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
