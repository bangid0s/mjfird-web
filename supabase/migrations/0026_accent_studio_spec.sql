-- The "Studio Spec" pass moves the accent from the electric indigo to the hot
-- orange the direction is built around. As with 0025 this only rewrites rows
-- still sitting on the previous *default* — a deliberately chosen brand colour
-- is left alone.

alter table site_settings
  alter column accent_color set default '#f04e23';

update site_settings
  set accent_color = '#f04e23'
  where accent_color in ('#4b3bff', '#4B3BFF');
