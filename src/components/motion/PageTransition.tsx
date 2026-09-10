"use client";

import { usePathname } from "next/navigation";

/**
 * Fades each route in as it mounts.
 *
 * This was an `AnimatePresence mode="wait"` with an exit animation. In the App
 * Router that combination could leave the wrapper parked on its exit values —
 * opacity 0, nudged up 16px — after the router had already swapped the new
 * page in. The result was a blank screen: everything inside <main> present in
 * the DOM at full height but painted at zero opacity, while the nav and footer
 * (which live outside it) still rendered, so the page looked broken rather
 * than empty.
 *
 * There is no exit state now, and no presence bookkeeping left to get stuck.
 * `key` remounts the wrapper so the CSS animation replays per route, and if
 * the animation never runs — reduced motion, stylesheet not applied, anything
 * — the content is simply visible. It fails visible, which is the point.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
