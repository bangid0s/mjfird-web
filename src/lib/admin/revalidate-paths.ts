/*
  Which public pages show which admin content, so a save refreshes all of
  them. Kept apart from the server actions so the lists can be tested: a page
  left off one of these keeps serving the old content until its cache expires.
*/
export const HOME_CONTENT_PATHS = {
  /** The gallery page, plus the home page: its hero wall and menu samples are gallery images. */
  gallery: ["/", "/gallery"],
} as const;
