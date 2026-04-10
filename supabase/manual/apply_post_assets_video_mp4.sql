-- Ejecutar en Supabase SQL Editor si no corrés migraciones desde CLI.
-- Corrige: "mime type video/mp4 is not supported" al subir videos a post-assets.

update storage.buckets
set
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4'
  ]::text[],
  file_size_limit = 104857600
where id = 'post-assets';
