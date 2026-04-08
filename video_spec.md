# Servy Content Agent — Video Spec v1.0

> Spec para agregar generación de videos al agente de contenido existente.
> Se integra en el repo `Servy-content-agent`.
> Leer `servy_content_spec.md` y el brandbook antes de implementar.

---

## CONTEXTO

El agente de contenido ya genera imágenes con fal.ai.
Este spec agrega videos cortos para Reels y Stories usando los mismos modelos de fal.ai.
El flujo de aprobación es idéntico al de imágenes — el founder aprueba antes de publicar.

---

## MODELO DE fal.ai

Usar **Kling v1.6** (`fal-ai/kling-video/v1.6/standard/text-to-video`).

```typescript
const result = await fal.subscribe('fal-ai/kling-video/v1.6/standard/text-to-video', {
  input: {
    prompt: string,          // prompt generado por Gemini
    negative_prompt: string, // lo que NO debe aparecer
    duration: '5' | '10',   // segundos (5s = hasta 30s de reel con loop, 10s = 60s)
    aspect_ratio: '9:16' | '1:1',
  }
})
```

---

## SCHEMA — nuevas columnas en tabla `posts`

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_duration integer; -- segundos
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_prompt text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_content_type text;
-- 'provider_working' | 'user_receiving' | 'both'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_tone text;
-- 'urgent' | 'aspirational' | 'educational'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_category text;
-- 'plomeria' | 'electricidad' | 'gas' | 'cerrajeria' | 'aires' | 'general'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_duration_seconds integer;
-- 15 | 30 | 60
```

---

## FORMULARIO DE CREACIÓN — campos

Cuando el usuario crea un post con `format: 'reel'` o `format: 'story'`, mostrar estos campos adicionales:

```typescript
interface VideoCreationForm {
  // Lo que el founder escribe
  topic: string                    // "Qué querés comunicar" — texto libre, máx 200 chars

  // Selecciones
  contentType: 
    | 'provider_working'           // Técnico trabajando (plomero, electricista, etc.)
    | 'user_receiving'             // Usuario recibiendo el servicio / problema resuelto
    | 'both'                       // Ambos en el mismo video

  durationSeconds: 15 | 30 | 60   // Duración del video final

  format: 'reel' | 'story'        // 9:16 en ambos casos

  serviceCategory:
    | 'plomeria'
    | 'electricidad' 
    | 'gas'
    | 'cerrajeria'
    | 'aires'
    | 'general'

  tone:
    | 'urgent'                     // "Se me rompió algo, lo necesito ya"
    | 'aspirational'               // "Así es como debería ser contratar un técnico"
    | 'educational'                // "Sabías que..."
}
```

---

## REGLAS DEL PROMPT — lo que el agente DEBE incluir siempre

Estas reglas son no negociables y se inyectan en cada prompt generado:

### Personas y ambientes

```
PERSONAS:
- Argentinos urbanos, aspecto natural y contemporáneo
- Sin estereotipos: ni muy corporativo ni muy informal
- Proveedores: ropa de trabajo limpia y ordenada, herramientas visibles pero discretas
- Usuarios: casual home, expresión tranquila o aliviada (problema ya resuelto)
- Diversidad natural de tonos de piel y edades
- NUNCA: personas angustiadas, ambientes sucios, ropa deteriorada

AMBIENTES:
- Departamentos o casas urbanas argentinas modernas
- Cocinas, baños, livings — ordenados y bien iluminados
- Luz natural brillante, nunca oscura ni dramática
- NUNCA: mansiones, ambientes de lujo extremo, oficinas, espacios extranjeros
```

### Estilo visual

```
ESTILO:
- Fotorrealista, cámara profesional
- Movimientos de cámara suaves (no sacudidas)
- Colores dominantes: blanco, verde (#16a34a), gris claro
- Sin texto superpuesto en el video (el texto va en el caption)
- Sin logos dentro del video
- Calidad cinematográfica, no amateur
```

### Lo que NUNCA debe aparecer

```
NEGATIVO (negative_prompt):
- text, watermark, logo, subtitle, caption
- ugly, deformed, blurry, low quality
- dangerous situation, blood, fire hazard, electrical sparks
- dirty clothes, messy environment
- stock photo look, non-Argentine setting
- luxury mansion, poverty
- corporate office, foreign cars
```

### Límites de duración

```
- Reel 15 segundos → fal.ai duration: '5' (loop x3)
- Reel 30 segundos → fal.ai duration: '10' (loop x3)
- Reel 60 segundos → fal.ai duration: '10' (loop x6, con variaciones)
- Story → siempre 15 segundos → fal.ai duration: '5'
```

---

## GENERACIÓN DEL PROMPT CON GEMINI

### System prompt: `lib/agents/prompts/video-generator.ts`

```typescript
export const VIDEO_PROMPT_SYSTEM = `
Sos el agente generador de videos de Servy, marketplace de técnicos del hogar en Argentina.
Tu tarea es convertir la descripción del founder en un prompt cinematográfico para fal.ai Kling v1.6.

BRANDBOOK (resumen):
- Servy conecta usuarios con técnicos del hogar por WhatsApp en Argentina
- Tono: directo, cálido, argentino, sin corporativo
- Colores: verde #16a34a dominante, blanco, gris claro
- Personas: argentinos urbanos naturales, no estereotipados

REGLAS OBLIGATORIAS DEL PROMPT:
1. Siempre describir movimiento de cámara suave (slow pan, gentle zoom, tracking shot)
2. Siempre mencionar: "photorealistic, professional cinematography, natural light"
3. Siempre incluir el ambiente argentino: "Buenos Aires apartment", "Argentine urban home"
4. El técnico siempre con ropa limpia y ordenada
5. El usuario siempre con expresión tranquila o aliviada
6. NUNCA poner texto en el video
7. NUNCA mostrar el problema — mostrar la solución
   Excepción: si el tono es 'educational', se puede mostrar el problema brevemente

TIPOS DE CONTENIDO:
- provider_working: enfocarse en el técnico realizando el trabajo con profesionalismo
- user_receiving: enfocarse en el usuario satisfecho, problema resuelto
- both: comenzar con el técnico trabajando y terminar con el usuario satisfecho

TONOS:
- urgent: ritmo visual más dinámico, cámara más activa, expresión del usuario de alivio inmediato
- aspirational: luz cálida, movimientos lentos y elegantes, sensación de "así debería ser siempre"
- educational: mostrar el antes/proceso/después de forma clara y ordenada

Devolvé SOLO un objeto JSON:
{
  "video_prompt": string,     // prompt principal para fal.ai, máx 300 palabras en inglés
  "negative_prompt": string,  // lo que no debe aparecer
  "suggested_caption": string // caption sugerido en español para el post, máx 150 chars
}
`;
```

---

## ARCHIVO: `lib/fal/generate-video.ts`

```typescript
import * as fal from '@fal-ai/serverless-client'

interface VideoGenerationParams {
  prompt: string
  negativePrompt: string
  durationSeconds: 15 | 30 | 60
  format: 'reel' | 'story'
}

interface VideoGenerationResult {
  videoUrl: string
  durationSeconds: number
}

export async function generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
  const falDuration = params.durationSeconds <= 15 ? '5' : '10'
  const aspectRatio = '9:16' // Reels y Stories siempre verticales

  const result = await fal.subscribe('fal-ai/kling-video/v1.6/standard/text-to-video', {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      duration: falDuration,
      aspect_ratio: aspectRatio,
    },
    logs: true,
  })

  const videoUrl = result.video?.url
  if (!videoUrl) throw new Error('fal.ai no devolvió URL de video')

  // Descargar y subir a Supabase Storage (igual que las imágenes)
  // Path: generated/{postId}/video.mp4

  return {
    videoUrl,
    durationSeconds: params.durationSeconds,
  }
}
```

---

## FLUJO COMPLETO

```
1. Founder abre kanban → "Nuevo post" → elige format: "reel" o "story"
2. Aparece el formulario con los 6 campos (topic, contentType, duration, format, category, tone)
3. Founder completa y envía → post pasa a estado "todo"
4. Al generar (manual o automático):
   a. Gemini recibe los 6 campos + brandbook → genera video_prompt + negative_prompt + caption
   b. fal.ai Kling v1.6 genera el video con esos prompts
   c. Video se sube a Supabase Storage
   d. Post pasa a estado "review" con video_url + suggested_caption
5. Founder recibe notificación (email/WhatsApp)
6. Founder revisa el video en el kanban → Aprobar / Rechazar con feedback
7. Si aprueba → se publica en Instagram Reels o Stories via Meta Graph API
8. 48hs después → el agente analista lee métricas y actualiza la estrategia
```

---

## ARCHIVOS A CREAR/MODIFICAR

```
Servy-content-agent/
├── lib/
│   ├── fal/
│   │   └── generate-video.ts          # NUEVO — generación de video con fal.ai
│   └── agents/
│       ├── generator.ts               # MODIFICAR — agregar lógica de video
│       └── prompts/
│           └── video-generator.ts     # NUEVO — system prompt para video
├── app/
│   └── api/
│       └── agent/
│           └── generate-video/
│               └── route.ts           # NUEVO — endpoint de generación
└── components/
    └── post/
        └── VideoForm.tsx              # NUEVO — formulario de creación
        └── VideoPlayer.tsx            # NUEVO — preview del video generado
```

---

## VARIABLES DE ENTORNO

```
FAL_API_KEY=   # ya existe — el mismo que para imágenes
```

No necesita variables nuevas.

---

## COSTOS ESTIMADOS

| Duración | fal.ai cost | Videos/mes (free) |
|---|---|---|
| 5s (→ 15s reel) | ~$0.05 | ~100 con $5 |
| 10s (→ 30/60s reel) | ~$0.10 | ~50 con $5 |

Para el piloto el free tier de fal.ai alcanza ampliamente.

---

## ORDEN DE IMPLEMENTACIÓN

1. `lib/agents/prompts/video-generator.ts` — system prompt
2. `lib/fal/generate-video.ts` — integración fal.ai
3. `app/api/agent/generate-video/route.ts` — endpoint
4. `components/post/VideoForm.tsx` — formulario con los 6 campos
5. `components/post/VideoPlayer.tsx` — preview
6. Migración SQL para las columnas nuevas en `posts`
7. Modificar `lib/agents/generator.ts` para detectar format reel/story y usar el flujo de video

`npx tsc --noEmit` debe terminar con exit 0.
