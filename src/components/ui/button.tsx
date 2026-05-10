import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border border-[#2f8fff] bg-[#2f8fff] text-white shadow-none hover:border-[#1f84ff] hover:bg-[#1f84ff] focus-visible:ring-[#2f8fff]/18",
        destructive:
          "bg-destructive text-white shadow-[0_10px_24px_rgba(196,61,61,0.18)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/35",
        outline:
          "border border-border/75 bg-[var(--surface-raised)] shadow-[0_1px_0_rgba(255,255,255,0.68)_inset] hover:border-border hover:bg-accent/80 hover:text-accent-foreground",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-[0_1px_0_rgba(255,255,255,0.58)_inset] hover:bg-secondary",
        ghost:
          "hover:bg-accent/75 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-[6px] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[7px] px-2.5 has-[>svg]:px-2.5",
        lg: "h-10 rounded-[9px] px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[6px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
