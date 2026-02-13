import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "text" | "danger-text" | "highlight";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4262ff] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-[#ffd02f] text-[#050038] hover:bg-[#ffd02f]/90 shadow-sm": variant === "primary",
            "bg-white border border-[#050038]/10 text-[#050038] hover:bg-[#fafafa] shadow-sm": variant === "secondary",
            "bg-transparent text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]": variant === "ghost",
            "bg-transparent text-[#4262ff] hover:underline p-0 h-auto": variant === "text",
            "bg-transparent text-[#050038] hover:bg-[#fafafa]/50": variant === "danger-text", // Mapped red to dark for now, or could use Accent
            "bg-[#ffd02f]/20 text-[#050038] border border-[#ffd02f] hover:bg-[#ffd02f]/30": variant === "highlight",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-6 py-3 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
