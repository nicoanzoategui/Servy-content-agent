-- Permitir subir MP4 (generación de story/reel) y subir límite: 10 MiB no alcanza para video.
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
