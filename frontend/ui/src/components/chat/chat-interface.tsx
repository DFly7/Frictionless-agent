"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Paperclip, FileIcon, Plus, X } from "lucide-react";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatTab {
  id: string;
  title: string;
  messages: Message[];
}

function getTabTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.content.trim();
  return text.length > 28 ? `${text.slice(0, 25)}…` : text || "New chat";
}

export function ChatInterface() {
  const [tabs, setTabs] = useState<ChatTab[]>([
    { id: crypto.randomUUID(), title: "New chat", messages: [] },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const messages = activeTab.messages;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    const newMessages = [...messages, userMessage];
    setInput("");
    setIsLoading(true);

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, messages: newMessages, title: getTabTitle(newMessages) }
          : t
      )
    );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!res.ok) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  messages: [
                    ...newMessages,
                    {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: "Something went wrong. Try again.",
                    },
                  ],
                }
              : t
          )
        );
        return;
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
      };

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                messages: [...newMessages, assistantMessage],
                title: getTabTitle(newMessages),
              }
            : t
        )
      );
    } catch {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                messages: [
                  ...newMessages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "Something went wrong. Try again.",
                  },
                ],
              }
            : t
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newTab: ChatTab = {
      id: crypto.randomUUID(),
      title: "New chat",
      messages: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    if (nextTabs.length === 0) {
      const newTab: ChatTab = {
        id: crypto.randomUUID(),
        title: "New chat",
        messages: [],
      };
      setTabs([newTab]);
      setActiveTabId(newTab.id);
      return;
    }
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const nextIdx = Math.min(idx, nextTabs.length - 1);
      setActiveTabId(nextTabs[nextIdx].id);
    } else if (tabs.findIndex((t) => t.id === activeTabId) > idx) {
      setActiveTabId(activeTabId);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          setFiles(data.files);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      await fetchFiles();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setUploadError("Something went wrong. Try again or drag a different file.");
    } finally {
      setIsUploading(false);
    }
  };

  const hasUploads = files.length > 0;

  return (
    <div className="flex h-full w-full overflow-hidden flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border bg-muted/20 shrink-0 min-h-0">
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          <div className="flex items-center min-w-min">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role="tab"
                tabIndex={0}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTabId(tab.id);
                  }
                }}
                className={`
                  group flex items-center gap-2 px-4 py-3 text-sm font-medium
                  min-w-0 max-w-[200px] border-b-2 transition-colors cursor-pointer
                  ${
                    tab.id === activeTabId
                      ? "border-primary text-foreground bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                `}
              >
                <span className="truncate flex-1 min-w-0">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity shrink-0"
                  aria-label="Close tab"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNewChat}
          className="shrink-0 rounded-none border-l border-border"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 border-r border-border bg-muted/20 hidden md:flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">
              Your materials
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drop your notes or syllabi. Your tutor uses these to answer
              questions and build quizzes.
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {loadingFiles ? (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Loading…
                </p>
              ) : files.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Upload your first document to unlock your tutor&apos;s full
                  potential.
                </p>
              ) : (
                files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate" title={file}>
                      {file.split("/").pop()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border space-y-2">
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={handleFileClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Uploading…" : "Upload notes"}
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-16 md:py-24">
                  <div className="max-w-md mx-auto">
                    <h3 className="font-display text-xl md:text-2xl font-normal text-foreground mb-3">
                      Ask anything about your materials.
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Your tutor remembers this conversation forever.
                    </p>
                    {!hasUploads && (
                      <p className="text-sm text-muted-foreground mb-8">
                        Upload your first document to unlock your tutor&apos;s
                        full potential.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Try: &ldquo;Summarize my notes on calculus.&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <ChatMessage key={m.id} role={m.role} content={m.content} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Upload notes"
                  onClick={handleFileClick}
                  disabled={isUploading || isLoading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Input
                  value={input || ""}
                  onChange={handleInputChange}
                  placeholder="Ask anything about your materials…"
                  className="flex-1 min-h-[44px]"
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !(input || "").trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Your tutor can make mistakes. Consider checking important
                information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
