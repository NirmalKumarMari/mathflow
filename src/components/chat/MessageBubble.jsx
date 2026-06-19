import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, GraduationCap } from 'lucide-react';
import { cn } from "@/lib/utils";

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Processing';
  const status = toolCall?.status || 'pending';
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try { return typeof results === 'string' ? JSON.parse(results) : results; }
    catch { return results; }
  })();

  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );

  const statusConfig = {
    pending: { icon: Clock, color: 'text-muted-foreground', text: 'Pending' },
    running: { icon: Loader2, color: 'text-primary', text: 'Thinking...', spin: true },
    in_progress: { icon: Loader2, color: 'text-primary', text: 'Thinking...', spin: true },
    completed: isError
      ? { icon: AlertCircle, color: 'text-destructive', text: 'Error' }
      : { icon: CheckCircle2, color: 'text-emerald-600', text: 'Done' },
    success: { icon: CheckCircle2, color: 'text-emerald-600', text: 'Done' },
    failed: { icon: AlertCircle, color: 'text-destructive', text: 'Error' },
    error: { icon: AlertCircle, color: 'text-destructive', text: 'Error' }
  }[status] || { icon: Zap, color: 'text-muted-foreground', text: '' };

  const Icon = statusConfig.icon;
  const formattedName = name.split('.').reverse().join(' ').toLowerCase();

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:bg-muted/50",
          expanded ? "bg-muted border-border" : "bg-background border-border/60"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-muted-foreground">{formattedName}</span>
        {statusConfig.text && (
          <span className={cn("text-muted-foreground/70", isError && "text-destructive")}>
            · {statusConfig.text}
          </span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={cn("h-3 w-3 text-muted-foreground ml-auto transition-transform", expanded && "rotate-90")} />
        )}
      </button>

      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-border space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Input:</div>
              <pre className="bg-muted rounded-lg p-2 text-xs text-foreground/80 whitespace-pre-wrap">
                {(() => {
                  try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); }
                  catch { return toolCall.arguments_string; }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Result:</div>
              <pre className="bg-muted rounded-lg p-2 text-xs text-foreground/80 whitespace-pre-wrap max-h-40 overflow-auto">
                {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border shadow-sm"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <div className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:font-display prose-headings:font-semibold">
                <ReactMarkdown
                  components={{
                    code: ({ inline, className, children, ...props }) => {
                      return !inline ? (
                        <pre className="bg-muted rounded-xl p-3 overflow-x-auto my-2">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      ) : (
                        <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((toolCall, idx) => (
              <FunctionDisplay key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}