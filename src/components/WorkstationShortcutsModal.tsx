interface WorkstationShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstationShortcutsModal({ isOpen, onClose }: WorkstationShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = [
    {
      title: "Workstation Navigation",
      shortcuts: [
        { keys: ["Ctrl", "/"], desc: "Toggle Keyboard Shortcuts Guide" },
        { keys: ["Ctrl", "Shift", "A"], desc: "Jump to Autonomous AI Agent" },
        { keys: ["Ctrl", "Shift", "E"], desc: "Jump to Video Render & Export" },
        { keys: ["Ctrl", "Shift", "P"], desc: "Jump to YouTube Publishing" },
        { keys: ["Ctrl", "Shift", "I"], desc: "Jump to Analytics & Intelligence" },
        { keys: ["Ctrl", "S"], desc: "Quick Save Project State to SQLite" },
      ],
    },
    {
      title: "Playback & Timeline Transport",
      shortcuts: [
        { keys: ["Space"], desc: "Play / Pause Video & Audio Playback" },
        { keys: ["J"], desc: "Scrub Backward (-1.0 second)" },
        { keys: ["K"], desc: "Pause / Freeze Playhead" },
        { keys: ["L"], desc: "Scrub Forward (+1.0 second)" },
        { keys: ["Home"], desc: "Return Playhead to 00:00:00" },
        { keys: ["End"], desc: "Jump Playhead to Video End" },
      ],
    },
    {
      title: "Editing & Clip Operations",
      shortcuts: [
        { keys: ["S"], desc: "Split Selected Clip at Current Playhead" },
        { keys: ["Del"], desc: "Delete Selected Clip or Subtitle" },
        { keys: ["Ctrl", "Z"], desc: "Undo Last Timeline Edit" },
        { keys: ["Ctrl", "Y"], desc: "Redo Timeline Edit" },
        { keys: ["["], desc: "Set In-Point (Trim Start)" },
        { keys: ["]"], desc: "Set Out-Point (Trim End)" },
      ],
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "14px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              ⌨ Professional Workstation Hotkeys
            </h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              Industry-standard editing and navigation keyboard shortcuts.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Esc / Close
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {categories.map((cat, idx) => (
            <div key={idx}>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#38bdf8",
                  fontWeight: 700,
                }}
              >
                {cat.title}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "6px",
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  border: "1px solid #334155",
                }}
              >
                {cat.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: sIdx < cat.shortcuts.length - 1 ? "1px solid #283548" : "none",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{sc.desc}</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            background: "#0f172a",
                            border: "1px solid #475569",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#f8fafc",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "20px",
            paddingTop: "14px",
            borderTop: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          <span>Tip: Press <kbd style={{ background: "#1e293b", padding: "1px 6px", borderRadius: "3px" }}>?</kbd> anywhere to open this dialog.</span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              background: "#3b82f6",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
