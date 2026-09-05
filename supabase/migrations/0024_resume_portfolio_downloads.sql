-- Two extra download buttons in the /resume header, sitting alongside the
-- resume PDF: one for the graphic design portfolio, one for illustration.
-- Each button is driven by its own link — blank hides it — and each label is
-- editable, so the buttons can be renamed from the admin without a deploy.

alter table site_settings
  add column if not exists resume_graphic_portfolio_label text not null default 'Graphic Design Portfolio',
  add column if not exists resume_graphic_portfolio_url text not null default '',
  add column if not exists resume_illustration_portfolio_label text not null default 'Illustration Portfolio',
  add column if not exists resume_illustration_portfolio_url text not null default '';
