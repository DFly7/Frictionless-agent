import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  MessageSquare,
  Settings2,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { AssistantTurn, ChatTurn } from "./chat-model";

interface ChatMessageProps {
  turn: ChatTurn;
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="ml-2">{children}</li>
  ),
  code: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn(
          "block p-3 rounded-md bg-muted text-sm font-mono overflow-x-auto",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-2 overflow-x-auto">{children}</pre>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary/30 pl-3 my-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="leading-relaxed overflow-x-auto [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_pre]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ToolStatusIcon({ status }: { status: AssistantTurn["toolCalls"][number]["status"] }) {
  if (status === "success") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }

  return <Settings2 className="h-4 w-4 animate-pulse text-muted-foreground" />;
}

function AssistantTurnContent({ turn }: { turn: AssistantTurn }) {
  const hasThinking = Boolean(turn.reasoning?.trim());

  return (
    <div className="space-y-3">
      {hasThinking && (
        <details className="rounded-md border border-border bg-background/70">
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <BrainCircuit className="h-4 w-4" />
            Thinking
          </summary>
          <div className="border-t border-border px-3 py-3 text-sm text-muted-foreground">
            <div className="whitespace-pre-wrap">{turn.reasoning}</div>
          </div>
        </details>
      )}

      {turn.toolCalls.length > 0 && (
        <div className="space-y-2">
          {turn.toolCalls.map((toolCall) => (
            <div
              key={toolCall.id}
              className="rounded-md border border-border bg-background/70"
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                <ToolStatusIcon status={toolCall.status} />
                <span className="font-medium">{toolCall.name}</span>
              </div>
              <div className="px-3 py-3">
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  <code>{toolCall.argumentsText}</code>
                </pre>
                {toolCall.result && (
                  <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide">
                      Observation
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                      {toolCall.result}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {turn.finalContent && <MarkdownContent content={turn.finalContent} />}

      {turn.status === "streaming" && !turn.finalContent && (
        <div className="text-sm text-muted-foreground animate-pulse">Working...</div>
      )}
    </div>
  );
}

export function ChatMessage({ turn }: ChatMessageProps) {
  const isUser = turn.kind === "user";
  const assistantTurn = turn.kind === "assistant_turn" ? turn : null;

  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar
        className={cn(
          "border shrink-0",
          isUser ? "bg-primary" : "bg-primary/10 border-primary/20"
        )}
      >
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "text-xs text-muted-foreground mb-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {isUser ? "You" : "Your tutor"}
        </div>
        <Card
          className={cn(
            "p-3.5 text-sm shadow-sm overflow-hidden",
            isUser
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 border-border"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{turn.content}</div>
          ) : (
            assistantTurn && <AssistantTurnContent turn={assistantTurn} />
          )}
        </Card>
      </div>
    </div>
  );
}
