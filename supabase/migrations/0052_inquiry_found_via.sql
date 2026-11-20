-- "How did you find me?" on contact-form inquiries.
--
-- Holds a value from src/lib/found-via.ts (google, ai-assistant, instagram…).
-- Null on inquiries sent before the field existed. Commission requests keep
-- the same answer in their answers list (id 'found_via'), so no change there.
--
-- Count leads per channel:
--   select found_via, count(*) from inquiries group by 1 order by 2 desc;
--   select a->>'value' as found_via, count(*)  -- stored as the label
--   from commission_requests, jsonb_array_elements(answers) a
--   where a->>'id' = 'found_via' group by 1 order by 2 desc;
--
-- Additive and safe to run again.

alter table inquiries add column if not exists found_via text;

create index if not exists inquiries_found_via_idx on inquiries (found_via);
