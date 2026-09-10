-- The redesign moves the site off the riso-pink accent onto the "Signal"
-- electric indigo. The accent is admin-editable, so this only rewrites rows
-- that are still sitting on the old *default* — anyone who deliberately picked
-- a brand colour keeps it.

alter table site_settings
  alter column accent_color set default '#4b3bff';

update site_settings
  set accent_color = '#4b3bff'
  where accent_color in ('#ff2e88', '#FF2E88');
