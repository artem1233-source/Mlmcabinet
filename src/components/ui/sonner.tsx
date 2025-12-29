"use client";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-gray-600',
          actionButton: 'group-[.toast]:bg-[#39B7FF] group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600',
          closeButton: 'group-[.toast]:bg-white group-[.toast]:border-gray-200 group-[.toast]:text-gray-600 group-[.toast]:hover:bg-gray-100',
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };