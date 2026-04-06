-- Bucket público para imágenes generadas (URLs estables en Supabase, no fal.ai)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-assets',
  'post-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read post-assets" on storage.objects;

create policy "Public read post-assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'post-assets');
