"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { ComponentPropsWithoutRef } from "react";

function MarkdownLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href && href.startsWith("/")) {
    return (
      <Link
        href={href}
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
      >
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

export function BlogMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        a: MarkdownLink,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
