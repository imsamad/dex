"use client";

import React, { ReactNode } from "react";

export const Button = (
  p: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }
) => {
  const { children,  className, ...props } = p;

  return <button          className={`p-4 rounded-md border cursor-pointer hover:border-3 hover:rounded-4xl transition-all duration-250 hover:scale-[1.00001] disabled:border-8 disabled:border-red-500 ${className}` }
 {...props}>{children}</button>;
};
