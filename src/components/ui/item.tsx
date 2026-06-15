import * as React from "react";
import { cn } from "@/lib/utils";

export const Item = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { size?: "xs" | "sm" | "default" }
>(({ className, size = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 w-full",
      {
        "p-1": size === "xs",
        "p-2": size === "sm",
        "p-3": size === "default",
      },
      className,
    )}
    {...props}
  />
));
Item.displayName = "Item";

export const ItemContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col items-start text-left gap-0.5", className)}
    {...props}
  />
));
ItemContent.displayName = "ItemContent";

export const ItemTitle = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("text-sm font-bold text-foreground leading-none", className)}
    {...props}
  />
));
ItemTitle.displayName = "ItemTitle";

export const ItemDescription = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-1",
      className,
    )}
    {...props}
  />
));
ItemDescription.displayName = "ItemDescription";
