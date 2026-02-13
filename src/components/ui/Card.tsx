import React from "react";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl bg-white text-[#0f172a] shadow-[0px_2px_8px_rgba(15,23,42,0.08)]",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
