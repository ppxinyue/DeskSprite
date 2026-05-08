import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "defaultValue" | "onChange" | "type" | "value"> & {
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
}) {
  const currentValue = Array.isArray(value)
    ? value[0]
    : Array.isArray(defaultValue)
      ? defaultValue[0]
      : min;
  const percent = ((Number(currentValue) - Number(min)) / (Number(max) - Number(min))) * 100;

  return (
    <input
      type="range"
      data-slot="slider"
      defaultValue={Array.isArray(defaultValue) ? defaultValue[0] : undefined}
      value={currentValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn(
        "desk-slider h-7 w-full min-w-0 cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
      style={{
        '--slider-percent': `${Math.max(0, Math.min(100, percent))}%`,
      } as React.CSSProperties}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
      {...props}
    />
  )
}

export { Slider }
