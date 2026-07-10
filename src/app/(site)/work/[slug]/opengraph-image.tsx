import { ImageResponse } from "next/og";
import { getProject } from "@/lib/data/projects";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0b0d",
          color: "#f5f1e8",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", width: 64, height: 10, background: "#ff2e88" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#ff2e88" }}>
            {project?.category ?? "MJFIRD"}
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.02 }}>
            {project?.title ?? "MJFIRD"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#9a9499", letterSpacing: 2, textTransform: "uppercase" }}>
          MJFIRD.COM
        </div>
      </div>
    ),
    { ...size },
  );
}
