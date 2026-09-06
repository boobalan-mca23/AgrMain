import React, { useState, useEffect, useCallback } from "react";
import logo from "../../Assets/agrLogo.png";

/**
 * TitleBar — custom frameless window titlebar for Electron.
 * Renders a draggable bar at the top with:
 *   • App logo + name (left)
 *   • Window controls: minimize, maximize/restore, close (right)
 *
 * Only visible when window.electronAPI?.isElectron is true.
 * Height is 38px — CSS variable --titlebar-height is set on <html>
 * so every page can offset their content accordingly.
 */
const TITLEBAR_HEIGHT = 38;

export default function TitleBar() {
  const isElectron = !!window.electronAPI?.isElectron;
  const platform = window.electronAPI?.platform || "unknown";
  const isWine = !!window.electronAPI?.isWine;
  const [maximized, setMaximized] = useState(false);
  const [hovered, setHovered] = useState(null); // "min" | "max" | "close"

  // Only Windows (win32) and macOS (darwin) will render the OS-native control overlays in our configuration
  // When running in Wine, native Windows control overlays are not supported/functional.
  const useNativeControls = (platform === "win32" && !isWine) || platform === "darwin";

  // Sync maximized state on mount + whenever window state changes
  const syncMaximized = useCallback(async () => {
    if (window.electronAPI?.isMaximized) {
      const result = await window.electronAPI.isMaximized();
      setMaximized(result);
    }
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    syncMaximized();

    let timeoutId = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        syncMaximized();
      }, 100);
    };

    // Re-sync on resize (covers maximize/unmaximize via OS or double-click)
    window.addEventListener("resize", handleResize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isElectron, syncMaximized]);

  if (!isElectron) return null;

  const handleMinimize = () => window.electronAPI.minimizeWindow();
  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
    // Optimistic toggle — resize event will correct it
    setMaximized((prev) => !prev);
  };
  const handleClose = () => window.electronAPI.closeWindow();

  // Dynamic layout adjustments to avoid overlapping native system controls:
  // - On Windows, native controls are on the right (approx. 140px width).
  // - On macOS, native controls (traffic lights) are on the left (approx. 80px width).
  const dragRegionStyle = {
    ...styles.dragRegion,
    paddingLeft: platform === "darwin" ? "80px" : "12px",
    paddingRight: (platform === "win32" && !isWine) ? "140px" : "12px",
  };

  return (
    <div style={styles.bar}>
      {/* Draggable region — covers the entire bar except the buttons */}
      <div style={dragRegionStyle}>
        <img src={logo} alt="AGR" style={styles.logo} draggable={false} />
        <span style={styles.appName}>AGR Jewellery Management</span>
      </div>

      {/* Window control buttons (Rendered only on Linux or when running outside Electron) */}
      {!useNativeControls && (
        <div style={styles.controls}>
          {/* Minimize */}
          <button
            id="titlebar-minimize"
            title="Minimize"
            style={getBtnStyle("min", hovered)}
            onMouseEnter={() => setHovered("min")}
            onMouseLeave={() => setHovered(null)}
            onClick={handleMinimize}
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Maximize / Restore */}
          <button
            id="titlebar-maximize"
            title={maximized ? "Restore" : "Maximize"}
            style={getBtnStyle("max", hovered)}
            onMouseEnter={() => setHovered("max")}
            onMouseLeave={() => setHovered(null)}
            onClick={handleMaximize}
          >
            {maximized ? (
              // Restore icon (two overlapping squares)
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            ) : (
              // Maximize icon (single square)
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="0.6" y="0.6" width="8.8" height="8.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            id="titlebar-close"
            title="Close"
            style={getBtnStyle("close", hovered)}
            onMouseEnter={() => setHovered("close")}
            onMouseLeave={() => setHovered(null)}
            onClick={handleClose}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: `${TITLEBAR_HEIGHT}px`,
    background: "linear-gradient(90deg, #1a2435 0%, #243048 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10000,
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  dragRegion: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "100%",
    WebkitAppRegion: "drag",
    cursor: "default",
  },
  logo: {
    height: "20px",
    width: "auto",
    borderRadius: "3px",
    flexShrink: 0,
  },
  appName: {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    height: "100%",
    WebkitAppRegion: "no-drag",
  },
};

function getBtnStyle(id, hovered) {
  const isClose = id === "close";
  const isHovered = hovered === id;

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "46px",
    height: `${TITLEBAR_HEIGHT}px`,
    border: "none",
    outline: "none",
    cursor: "pointer",
    color: isHovered && isClose ? "#fff" : "rgba(255,255,255,0.75)",
    backgroundColor:
      isHovered
        ? isClose
          ? "#e81123"                       // Windows-style red for close
          : "rgba(255,255,255,0.12)"
        : "transparent",
    transition: "background-color 0.15s ease, color 0.15s ease",
    WebkitAppRegion: "no-drag",
    padding: 0,
  };
}
