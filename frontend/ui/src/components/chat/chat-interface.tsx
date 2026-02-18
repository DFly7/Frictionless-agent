"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Upload, Paperclip, FileIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, something went wrong: ${err.error || res.statusText}`,
          },
        ]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Connection failed: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch files on mount
  const fetchFiles = useCallback(async () => {
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        // The API returns { files: ["path/to/file.txt", ...] }
        if (data.files && Array.isArray(data.files)) {
          setFiles(data.files);
        }
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Auto-scroll to bottom on new messages
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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      // Refresh files list
      await fetchFiles();

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sidebar: Files */}
      <aside className="w-64 border-r bg-muted/10 hidden md:flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Files</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loadingFiles ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
            ) : (
              files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate" title={file}>{file.split('/').pop()}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full gap-2 text-xs"
            onClick={handleFileClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="animate-spin">⌛</span>
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-20">
                <h3 className="text-lg font-semibold mb-2">Welcome to Nanobot</h3>
                <p>Start chatting or upload a file to begin.</p>
              </div>
            )}

            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                // @ts-ignore
                role={m.role as "user" | "assistant" | "system" | "data"}
                // @ts-ignore
                content={m.content}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Upload file"
                onClick={handleFileClick}
                disabled={isUploading || isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Input
                value={input || ""}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px]"
                disabled={isLoading}
              />

              <Button type="submit" size="icon" disabled={isLoading || !(input || "").trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Nanobot can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
