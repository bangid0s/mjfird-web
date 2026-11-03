"use client";

/**
 * When no PDF has been uploaded, the page itself is the PDF: the print
 * stylesheet strips the window chrome and colour blocks, so "Save as PDF"
 * in the browser's print dialog gives a clean one-column CV.
 */
export default function PrintButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
