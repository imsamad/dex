"use client";

import React, { ReactNode } from "react";

export const Button = (
  p: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    isLoading?: boolean;
  },
) => {
  const { children, className, isLoading = false, disabled, ...props } = p;

  return (
    <button
      className={`p-2 rounded-md border cursor-pointer hover:border-3 hover:rounded-4xl transition-all duration-250 hover:scale-[1.00001] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border disabled:hover:rounded-md bg-sky-400 ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
      {isLoading ? "..." : ""}
    </button>
  );
};
