import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-14 w-full rounded-[9px] border border-input/80 bg-[var(--surface-raised)] px-3 py-2 text-base shadow-[0_1px_0_rgba(255,255,255,0.62)_inset] transition-[background,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring/55 focus-visible:bg-[var(--glass-bg-strong)] focus-visible:ring-[3px] focus-visible:ring-ring/12 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/70 aria-invalid:ring-[3px] aria-invalid:ring-destructive/12 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
