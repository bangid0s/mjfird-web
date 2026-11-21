/*
  Fallback alt text for artwork. The admin can still write a real alt per
  image (and should, for the best pieces); this only fills the blanks, so no
  image ships with alt="" and loses its value in Google Images.
*/

const ARTIST = "M.J. Fird";

/** "Orc Bard - Character Design, illustration by M.J. Fird". */
export function projectImageLabel(project: { title: string; category?: string }): string {
  const title = project.title.trim();
  const category = (project.category ?? "").trim().toLowerCase();
  return category ? `${title}, ${category} by ${ARTIST}` : `${title} by ${ARTIST}`;
}
