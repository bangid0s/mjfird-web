// Renders the right logo image for the active theme. If no light-mode logo is
// set, the dark-mode logo is used for both themes.
export default function ThemedLogo({
  darkUrl,
  lightUrl,
  className,
  alt = "",
}: {
  darkUrl: string;
  lightUrl?: string | null;
  className: string;
  /** Set when the logo is a link's only content (e.g. "MJFIRD home"); "" when decorative. */
  alt?: string;
}) {
  if (!lightUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={darkUrl} alt={alt} className={className} />;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={darkUrl} alt={alt} className={`theme-dark-only ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightUrl} alt={alt} className={`theme-light-only ${className}`} />
    </>
  );
}
