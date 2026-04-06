import type { PostStatus } from "@/types";

export const KANBAN_COLUMNS: {
  status: PostStatus;
  label: string;
  description: string;
  accentClass: string;
  headerClass: string;
}[] = [
  {
    status: "todo",
    label: "To do",
    description: "Planificados, pendientes de generar",
    accentClass: "border-zinc-300 bg-zinc-50",
    headerClass: "bg-zinc-200/80 text-zinc-800",
  },
  {
    status: "generating",
    label: "Generando",
    description: "El agente está trabajando",
    accentClass: "border-amber-200 bg-amber-50",
    headerClass: "bg-amber-200/90 text-amber-950",
  },
  {
    status: "review",
    label: "Para revisar",
    description: "Listo para aprobación",
    accentClass: "border-sky-200 bg-sky-50",
    headerClass: "bg-sky-200/90 text-sky-950",
  },
  {
    status: "approved",
    label: "Aprobado",
    description: "Pendiente de publicar",
    accentClass: "border-emerald-200 bg-emerald-50",
    headerClass: "bg-emerald-200/80 text-emerald-950",
  },
  {
    status: "published",
    label: "Publicado",
    description: "Live en redes",
    accentClass: "border-emerald-400 bg-emerald-100/60",
    headerClass: "bg-emerald-600 text-white",
  },
  {
    status: "failed",
    label: "Fallido",
    description: "Error en generación o publicación",
    accentClass: "border-red-200 bg-red-50",
    headerClass: "bg-red-200/90 text-red-950",
  },
];
