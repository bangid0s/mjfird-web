-- Google Analytics 4. Blank = tracking off; the ID is the measurement ID from
-- GA Admin → Data streams → the web stream, e.g. 'G-XXXXXXXXXX'.

alter table site_settings
  add column if not exists ga_measurement_id text not null default '';
