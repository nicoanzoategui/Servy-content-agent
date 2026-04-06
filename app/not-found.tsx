import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
      <h1 className="text-xl font-semibold text-zinc-900">No encontrado</h1>
      <p className="text-center text-sm text-zinc-600">
        El recurso no existe o no tenés acceso.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Volver al kanban
      </Link>
    </div>
  );
}
