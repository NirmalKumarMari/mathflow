import React from "react";
import ReactMarkdown from "react-markdown";

const components = {
  h1: ({ node, ...props }) => <h1 className="text-lg font-display font-bold text-foreground mt-4 mb-2" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-base font-display font-semibold text-foreground mt-4 mb-2" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-sm font-display font-semibold text-foreground mt-3 mb-1" {...props} />,
  h4: ({ node, ...props }) => <h4 className="text-sm font-semibold text-foreground mt-2 mb-1" {...props} />,
  p: ({ node, ...props }) => <p className="text-sm text-foreground leading-relaxed mb-2" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-2" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 space-y-1 mb-2" {...props} />,
  li: ({ node, ...props }) => <li className="text-sm text-foreground leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  em: ({ node, ...props }) => <em className="italic text-foreground" {...props} />,
  code: ({ node, inline, ...props }) =>
    inline
      ? <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono" {...props} />
      : <pre className="p-3 rounded-lg bg-muted text-foreground text-xs font-mono overflow-x-auto mb-2"><code {...props} /></pre>,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground my-2" {...props} />,
  hr: () => <hr className="border-border my-3" />,
  a: ({ node, ...props }) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
  table: ({ node, ...props }) => <div className="overflow-x-auto mb-2"><table className="w-full text-xs border border-border rounded-lg" {...props} /></div>,
  th: ({ node, ...props }) => <th className="border border-border bg-muted px-2 py-1 text-left font-semibold" {...props} />,
  td: ({ node, ...props }) => <td className="border border-border px-2 py-1" {...props} />,
};

export default function StyledMarkdown({ children, className = "" }) {
  return (
    <div className={className}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}