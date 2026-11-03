import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme's named type scale (globals.css). Without telling tailwind-merge
// these are font sizes, it reads `text-label` as a colour and drops it the
// moment a `text-ink` follows — the element silently falls back to 16px.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-lg",
            "display-md",
            "display-sm",
            "body-lg",
            "body",
            "body-sm",
            "label",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
