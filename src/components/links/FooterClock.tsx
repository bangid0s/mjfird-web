"use client";

import { useEffect, useState } from "react";

// Visitor-local wall clock for the window's status bar. Renders a placeholder
// on the server (the browser's zone is unknowable there) and starts ticking
// once mounted.
export default function FooterClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-label tabular-nums text-ink-faint">{time ?? "--:--:--"}</span>
  );
}
