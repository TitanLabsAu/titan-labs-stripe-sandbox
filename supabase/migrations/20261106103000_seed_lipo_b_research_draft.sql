-- Create an empty, editable Research Lab draft. Keep any existing entry intact.
insert into public.research_entries (slug, title, published)
values ('lipo-b', 'Lipo-B', false)
on conflict (slug) do nothing;
