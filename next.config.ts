import type { NextConfig } from "next";
import { OPTIMIZED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Artwork URLs don't change in place (a new upload is a new URL), so an
    // optimized copy can live for a month instead of the 4-hour default —
    // fewer re-encodes, and repeat visitors get it straight from the CDN.
    minimumCacheTTL: 2678400,
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
