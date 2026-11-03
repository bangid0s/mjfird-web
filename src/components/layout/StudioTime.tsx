"use client";

import { useEffect, useState } from "react";

/*
  The studio's own clock, so a visitor in another zone knows whether a reply
  is likely today. Placeholder on the server, ticking once mounted.
*/
export default function StudioTime({ timeZone = "Asia/Jakarta", label = "WIB" }: { timeZone?: string; label?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timeZone]);

  return (
    <span className="mono-meta tabular-nums">
      Studio time {time ?? "--:--"} {label}
    </span>
  );
}
