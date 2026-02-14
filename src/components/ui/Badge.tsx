import React from "react";
import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "live" | "paused" | "collecting" | "neutral" | "info";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "neutral", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
          {
            "bg-[#4262ff] text-white": variant === "live",
            "bg-[#ffd02f] text-[#050038]": variant === "paused",
            "bg-[#4262ff]/10 text-[#4262ff]": variant === "collecting",
            "bg-[#fafafa] text-[#050038]/60": variant === "neutral",
            "bg-[#4262ff]/20 text-[#4262ff]": variant === "info",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
