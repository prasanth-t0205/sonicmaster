"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  size?: string;
  className?: string;
}

export const Divider = ({
  orientation = "vertical",
  size = "1.5rem",
  className,
}: DividerProps) => {
  return (
    <div
      style={{
        [orientation === "vertical" ? "height" : "width"]: size,
      }}
      className={cn(
        "bg-border shrink-0 self-center",
        orientation === "vertical" ? "w-px" : "h-px",
        className,
      )}
    />
  );
};
