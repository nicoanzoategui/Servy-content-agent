"use client";

type Props = {
  src: string | null | undefined;
  className?: string;
};

export function VideoPlayer({ src, className }: Props) {
  if (!src?.trim()) {
    return null;
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      aria-label="Vista previa del video generado"
      className={
        className ??
        "max-h-[min(70vh,520px)] w-full max-w-md rounded-lg border border-zinc-200 bg-black object-contain"
      }
    />
  );
}
