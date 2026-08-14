-- Gallery joins the site navigation.
--
-- The menu is stored per row, so changing the column default only helps fresh
-- installs — an existing site keeps whatever list it saved. Both are handled
-- here. The update appends rather than trying to slot Gallery into a
-- particular position, so any custom order or renamed labels survive intact;
-- reorder from Site Settings → Navigation afterwards if you want it elsewhere.

alter table site_settings
  alter column nav_links set default '[
    {"label": "Work", "href": "/work"},
    {"label": "Services", "href": "/services"},
    {"label": "About", "href": "/about"},
    {"label": "Dance", "href": "/dance"},
    {"label": "Gallery", "href": "/gallery"},
    {"label": "Blog", "href": "/blog"},
    {"label": "Contact", "href": "/contact"}
  ]'::jsonb;

-- Idempotent: reruns skip any row that already links to /gallery.
update site_settings
set nav_links = nav_links || '[{"label": "Gallery", "href": "/gallery"}]'::jsonb
where jsonb_typeof(nav_links) = 'array'
  and not exists (
    select 1
    from jsonb_array_elements(site_settings.nav_links) as link
    where link->>'href' = '/gallery'
  );
