"use client";

import type {
  VideoContentType,
  VideoDurationTarget,
  VideoTone,
} from "@/types";

export type VideoFormFormat = "reel" | "story";

export type VideoFormValues = {
  topic: string;
  contentType: VideoContentType;
  durationSeconds: VideoDurationTarget;
  format: VideoFormFormat;
  serviceCategory: string;
  tone: VideoTone;
};

const CONTENT_TYPES: { value: VideoContentType; label: string }[] = [
  { value: "provider_working", label: "Técnico trabajando" },
  { value: "user_receiving", label: "Usuario / problema resuelto" },
  { value: "both", label: "Técnico + usuario" },
];

const DURATIONS: { value: VideoDurationTarget; label: string }[] = [
  { value: 15, label: "15 segundos" },
  { value: 30, label: "30 segundos" },
  { value: 60, label: "60 segundos" },
];

const FORMATS: { value: VideoFormFormat; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "plomeria", label: "Plomería" },
  { value: "electricidad", label: "Electricidad" },
  { value: "gas", label: "Gas" },
  { value: "cerrajeria", label: "Cerrajería" },
  { value: "aires", label: "Aire acondicionado" },
  { value: "general", label: "General" },
];

const TONES: { value: VideoTone; label: string }[] = [
  { value: "urgent", label: "Urgente — lo necesito ya" },
  { value: "aspirational", label: "Aspiracional — así debería ser" },
  { value: "educational", label: "Educativo — sabías que…" },
];

type Props = {
  value: VideoFormValues;
  onChange: (next: VideoFormValues) => void;
};

export function VideoForm({ value, onChange }: Props) {
  function patch(partial: Partial<VideoFormValues>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
      <p className="text-xs font-semibold text-emerald-900">
        Video (reel / story)
      </p>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">
          Qué querés comunicar (máx. 200 caracteres)
        </span>
        <textarea
          className="mt-1 min-h-[72px] w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          maxLength={200}
          value={value.topic}
          onChange={(e) => patch({ topic: e.target.value })}
          placeholder="Ej. Urgencia caño cocina — técnico llega rápido"
        />
        <span className="mt-0.5 block text-right text-[10px] text-zinc-400">
          {value.topic.length}/200
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Tipo de contenido</span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          value={value.contentType}
          onChange={(e) =>
            patch({ contentType: e.target.value as VideoContentType })
          }
        >
          {CONTENT_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">
          Duración del video final
        </span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          value={value.durationSeconds}
          disabled={value.format === "story"}
          onChange={(e) =>
            patch({
              durationSeconds: Number(e.target.value) as VideoDurationTarget,
            })
          }
        >
          {(value.format === "story" ? DURATIONS.filter((d) => d.value === 15) : DURATIONS).map(
            (o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Formato</span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          value={value.format}
          onChange={(e) => {
            const f = e.target.value as VideoFormFormat;
            patch({
              format: f,
              durationSeconds: f === "story" ? 15 : value.durationSeconds,
            });
          }}
        >
          {FORMATS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Categoría de servicio</span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          value={value.serviceCategory}
          onChange={(e) => patch({ serviceCategory: e.target.value })}
        >
          {CATEGORIES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Tono</span>
        <select
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          value={value.tone}
          onChange={(e) => patch({ tone: e.target.value as VideoTone })}
        >
          {TONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function defaultVideoFormValues(
  format: VideoFormFormat,
): VideoFormValues {
  return {
    topic: "",
    contentType: "provider_working",
    durationSeconds: 15,
    format,
    serviceCategory: "general",
    tone: "aspirational",
  };
}
