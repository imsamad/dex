"use client";

import React, { ReactNode } from "react";

export const Button = (
  p: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    isLoading:boolean
  },
) => {
  const { children, className, isLoading, ...props } = p;

  return (
    <button
      className={`p-2 rounded-md border cursor-pointer hover:border-3 hover:rounded-4xl transition-all duration-250 hover:scale-[1.00001] disabled:border-8 disabled:border-red-500 bg-sky-400 ${className}`}

      {...props}
    >
      {children}{isLoading ? "...":""}
    </button>
  );
};
