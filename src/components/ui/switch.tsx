"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-none transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/18 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-[#2f8fff] data-[state=unchecked]:bg-[#c8ced6] dark:data-[state=checked]:bg-[#5eb1ff] dark:data-[state=unchecked]:border-white/18 dark:data-[state=unchecked]:bg-white/16",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white ring-0 shadow-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 dark:data-[state=checked]:bg-white dark:data-[state=unchecked]:bg-white/92 dark:data-[state=unchecked]:shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
