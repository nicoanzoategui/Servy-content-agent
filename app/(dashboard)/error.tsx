"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50/80 p-6 text-sm text-red-950">
      <p className="font-medium">Algo salió mal en esta sección</p>
      <p className="mt-2 text-red-900/90">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-white hover:bg-red-900"
      >
        Reintentar
      </button>
    </div>
  );
}
