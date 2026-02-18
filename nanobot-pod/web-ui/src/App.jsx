import { useState, useRef, useEffect } from "react";

const API = "/api";

function api(path, userId, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-User-ID": userId, ...opts.headers },
  });
}

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({ onSelect }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🤖</div>
        <h1>Nanobot</h1>
        <p className="login-subtitle">1 User = 1 Persistent Agent</p>
        <p className="login-desc">Each user gets a dedicated AI agent with its own memory on disk.</p>
        <div className="login-buttons">
          <button className="user-btn user-1" onClick={() => onSelect("1")}>
            <span className="user-avatar">👤</span>
            <span>User 1</span>
          </button>
          <button className="user-btn user-2" onClick={() => onSelect("2")}>
            <span className="user-avatar">👤</span>
            <span>User 2</span>
          </button>
        </div>
        <p className="login-hint">Pick a user to talk to their dedicated agent.</p>
      </div>
    </div>
  );
}

// ─── Memory Panel ────────────────────────────────────────────────────────────

function MemoryPanel({ userId, visible, onClose }) {
  const [memory, setMemory] = useState("");
  const [history, setHistory] = useState("");
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState("memory");

  useEffect(() => {
    if (!visible) return;
    api("/memory", userId).then((r) => r.json()).then((d) => {
      setMemory(d.memory || "(empty)");
      setHistory(d.history || "(empty)");
    }).catch(() => {});
    api("/files", userId).then((r) => r.json()).then((d) => {
      setFiles(d.files || []);
    }).catch(() => {});
  }, [visible, userId]);

  if (!visible) return null;

  return (
    <div className="memory-panel">
      <div className="memory-header">
        <h3>Agent {userId} — Brain Inspector</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="memory-tabs">
        <button className={tab === "memory" ? "active" : ""} onClick={() => setTab("memory")}>
          MEMORY.md
        </button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
          HISTORY.md
        </button>
        <button className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}>
          Files
        </button>
      </div>
      <div className="memory-content">
        {tab === "memory" && <pre>{memory}</pre>}
        {tab === "history" && <pre>{history}</pre>}
        {tab === "files" && (
          <ul className="file-list">
            {files.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}
      </div>
      <p className="memory-hint">
        These files live at <code>./data/user{userId}/</code> on your host machine.
        Open them in VS Code to watch the agent think in real time.
      </p>
    </div>
  );
}

// ─── Chat Screen ─────────────────────────────────────────────────────────────

function ChatScreen({ userId, onSwitchUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const split = result.split(",");
        resolve(split.length > 1 ? split[1] : split[0]);
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function onSelectFiles(event) {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 0) {
      setPendingFiles((prev) => [...prev, ...selected]);
    }
    event.target.value = "";
  }

  function removePendingFile(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadPendingFiles() {
    if (pendingFiles.length === 0) return [];

    const payload = await Promise.all(
      pendingFiles.map(async (file) => ({
        name: file.name,
        content_base64: await fileToBase64(file),
      })),
    );

    const uploadRes = await api("/uploads", userId, {
      method: "POST",
      body: JSON.stringify({ files: payload }),
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.error || uploadData.detail || "Upload failed");
    }
    return uploadData.saved_files || [];
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || loading) return;

    setInput("");
    setLoading(true);

    try {
      const savedFiles = await uploadPendingFiles();
      if (savedFiles.length > 0) {
        setPendingFiles([]);
      }

      const visibleUserMessage = [
        text || "Uploaded file(s).",
        savedFiles.length > 0 ? `📎 Uploaded:\n- ${savedFiles.join("\n- ")}` : "",
      ].filter(Boolean).join("\n\n");

      const messageForAgent = [
        text || "I uploaded files. Please inspect them.",
        savedFiles.length > 0
          ? `Files uploaded to workspace folder "files_uploaded":\n- ${savedFiles.join("\n- ")}\nUse your read tool to inspect them.`
          : "",
      ].filter(Boolean).join("\n\n");

      setMessages((prev) => [...prev, { role: "user", content: visibleUserMessage }]);

      const res = await api("/chat", userId, {
        method: "POST",
        body: JSON.stringify({ message: messageForAgent }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            tools: data.tools_used,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "error", content: data.error || data.detail || "Something went wrong" },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: `Connection failed: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await api("/conversations", userId, { method: "DELETE" }).catch(() => {});
    setMessages([]);
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="header-left">
          <span className="header-logo">🤖</span>
          <h2>Nanobot — Agent {userId}</h2>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowMemory(!showMemory)} title="Inspect Agent Brain">
            🧠 Memory
          </button>
          <button onClick={clearChat} title="Clear conversation history">
            🗑️ Clear
          </button>
          <button onClick={onSwitchUser} title="Switch user">
            🔄 Switch User
          </button>
        </div>
      </header>

      <div className="chat-body">
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>👋 Say something to Agent {userId}!</p>
              <p className="hint">
                Try: "My name is ___" or "Remember that I like ___"
                <br />
                Then switch to User {userId === "1" ? "2" : "1"} and see they
                have completely separate memories.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-bubble">
                {msg.content}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="tools-badge">
                    🔧 {msg.tools.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-bubble thinking">Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <MemoryPanel
          userId={userId}
          visible={showMemory}
          onClose={() => setShowMemory(false)}
        />
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
        <div className="upload-row">
          <label className="upload-btn">
            📎 Upload files
            <input type="file" multiple onChange={onSelectFiles} disabled={loading} />
          </label>
          {pendingFiles.length > 0 && (
            <div className="pending-files">
              {pendingFiles.map((file, idx) => (
                <button
                  key={`${file.name}-${idx}`}
                  type="button"
                  className="pending-file"
                  onClick={() => removePendingFile(idx)}
                  title="Remove file"
                >
                  {file.name} ✕
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message Agent ${userId} (optional if files attached)...`}
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || (!input.trim() && pendingFiles.length === 0)}>
          Send
        </button>
      </form>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [userId, setUserId] = useState(null);

  if (!userId) {
    return <LoginScreen onSelect={setUserId} />;
  }

  return <ChatScreen userId={userId} onSwitchUser={() => setUserId(null)} />;
}
