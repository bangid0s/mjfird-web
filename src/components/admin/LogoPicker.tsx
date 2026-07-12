"use client";

import { useState } from "react";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import ImageUploader from "@/components/admin/ImageUploader";

type LogoType = "text" | "image";

export default function LogoPicker({
  initialType,
  initialText,
  initialUrl,
  initialUrlLight,
}: {
  initialType?: LogoType;
  initialText?: string;
  initialUrl?: string | null;
  initialUrlLight?: string | null;
}) {
  const [type, setType] = useState<LogoType>(initialType ?? "text");

  return (
    <div className="flex flex-col gap-6">
      <Field label="Header logo">
        <select
          name="logo_type"
          value={type}
          onChange={(e) => setType(e.target.value as LogoType)}
          className={fieldInputClasses}
        >
          <option value="text">Text wordmark</option>
          <option value="image">Image logo</option>
        </select>
      </Field>

      {type === "text" ? (
        <>
          <Field label="Wordmark text">
            <input
              name="logo_text"
              defaultValue={initialText ?? "MJFIRD"}
              className={fieldInputClasses}
            />
          </Field>
          {/* Keep the uploaded logos so switching back to image doesn't lose them */}
          <input type="hidden" name="logo_url" value={initialUrl ?? ""} />
          <input type="hidden" name="logo_url_light" value={initialUrlLight ?? ""} />
        </>
      ) : (
        <>
          <ImageUploader
            name="logo_url"
            label="Logo — dark mode (shown at 32px tall)"
            initialUrl={initialUrl}
          />
          <ImageUploader
            name="logo_url_light"
            label="Logo — light mode (optional; dark-mode logo is used if empty)"
            initialUrl={initialUrlLight}
          />
          <input type="hidden" name="logo_text" value={initialText ?? "MJFIRD"} />
        </>
      )}
    </div>
  );
}
