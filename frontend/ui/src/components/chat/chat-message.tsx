import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "data";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn("border", isUser ? "bg-blue-600" : "bg-primary")}>
        {isUser ? (
          <AvatarFallback className="bg-blue-600 text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div className="text-xs text-muted-foreground mb-1">
          {isUser ? "You" : "Nanobot"}
        </div>
        <Card
          className={cn(
            "p-3 text-sm shadow-sm",
            isUser 
              ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white" 
              : "bg-muted/50 dark:bg-muted/30"
          )}
        >
          <div className="whitespace-pre-wrap">{content}</div>
        </Card>
      </div>
    </div>
  );
}
