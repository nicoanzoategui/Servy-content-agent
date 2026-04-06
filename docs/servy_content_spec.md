# Servy Content Agent — Spec completo
> Documento vivo. Versión 1.0 — Abril 2026.
> Este documento es el input principal para el agente de desarrollo. Leerlo completo antes de escribir una sola línea de código.

---

## 1. Visión del sistema

Sistema autónomo de creación, publicación y optimización de contenido para redes sociales de Servy. Opera en un loop cerrado: analiza datos reales de Meta → actualiza la estrategia → genera contenido → publica → vuelve a analizar.

El humano (founder) solo interviene para aprobar o rechazar contenido antes de publicar. Todo lo demás es automático.

**No es un scheduler de posts. Es un agente que aprende qué funciona y mejora solo.**

---

## 2. Stack tecnológico

| Capa | Tecnología | Plan | Costo |
|---|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | — | $0 |
| Base de datos | Supabase (Postgres) | Free | $0 |
| Storage de assets | Supabase Storage | Free (500MB) | $0 |
| Deploy | Vercel | Hobby | $0 |
| LLM — orquestación y análisis | Gemini 2.0 Flash (Google AI SDK) | Free tier | $0 |
| LLM — copy on-brand (opcional) | Claude claude-sonnet-4-6 API | Pay per use | ~$1–3/mes |
| Generación de imágenes | fal.ai — modelo Flux Dev | Pay per use | ~$0.003/img |
| Generación de video (fase 2) | Runway ML o Kling AI | Pay per use | ~$0.50/video |
| Publicación social | Meta Graph API | Gratis | $0 |
| Analytics entrada | Meta Insights API | Gratis | $0 |
| UTM tracking | Propio (middleware Next.js) | — | $0 |
| Notificaciones aprobación | WhatsApp (Twilio) o Email (Resend) | Free tier | $0 |

**Variables de entorno requeridas:**
```
GOOGLE_AI_API_KEY=
ANTHROPIC_API_KEY=        # opcional
FAL_API_KEY=
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=         # long-lived token
META_PAGE_ID=
META_IG_ACCOUNT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=        # opcional
TWILIO_AUTH_TOKEN=         # opcional
NEXTAUTH_SECRET=
```

---

## 3. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   LOOP AUTÓNOMO                      │
│                                                     │
│  Meta Insights API                                  │
│       ↓                                             │
│  Agente Analista (Gemini)                           │
│       ↓                                             │
│  Archivo Madre (Supabase) ← estrategia viva         │
│       ↓                                             │
│  Kanban (Next.js front)                             │
│       ↓                                             │
│  Agente Generador (Gemini + fal.ai)                 │
│       ↓                                             │
│  Aprobación humana (notificación)                   │
│       ↓                                             │
│  Meta Graph API → publicado                         │
│       ↓                                             │
│  (48hs después) → vuelve al inicio                  │
└─────────────────────────────────────────────────────┘
```

### 3.1 Frecuencia de ciclos

- **Ciclo de análisis post**: se dispara automáticamente 48hs después de cada publicación. Lee métricas del post, actualiza el registro en Supabase, actualiza insights en el archivo madre.
- **Ciclo de estrategia semanal**: todos los lunes a las 9:00 AM (cron). El agente analista lee los últimos 30 días de datos, genera o actualiza la estrategia de la semana siguiente, crea las tarjetas en el kanban.
- **Ciclo de generación**: se dispara cuando una tarjeta pasa a estado `generating`. El agente generador produce imagen + copy + hashtags y los adjunta a la tarjeta.

---

## 4. Schema de base de datos (Supabase / Postgres)

### 4.1 Tabla `strategy` — el archivo madre

```sql
create table strategy (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_active boolean default true,

  -- Contexto de marca (se inicializa con el brandbook)
  brand_context jsonb not null,
  -- Ejemplo:
  -- {
  --   "tone": "directo, cálido, resolutivo",
  --   "colors": { "primary": "#16a34a", ... },
  --   "logo_rules": "...",
  --   "voice_rules": "...",
  --   "dont_do": [...]
  -- }

  -- Aprendizajes acumulados del agente
  insights jsonb default '[]',
  -- Ejemplo:
  -- [
  --   { "date": "2026-04-01", "finding": "stories de urgencia lunes 19hs tienen 3x CTR", "confidence": 0.85 },
  --   { "date": "2026-04-07", "finding": "posts con precio tienen menor engagement", "confidence": 0.6 }
  -- ]

  -- Reglas dinámicas que el agente actualiza
  current_rules jsonb default '{}',
  -- Ejemplo:
  -- {
  --   "best_days": ["monday", "thursday"],
  --   "best_times": ["19:00", "12:00"],
  --   "best_formats": ["story_urgency", "feed_before_after"],
  --   "avoid": ["feed_service_list"],
  --   "weekly_mix": { "feed": 3, "story": 4, "reel": 1 }
  -- }

  -- Plan semanal activo
  weekly_plan jsonb default '[]',
  -- Array de objetos post planificados

  -- Historial de versiones (append only)
  changelog jsonb default '[]'
);
```

### 4.1b Tabla `founder_strategy` — archivo madre del founder

```sql
create table founder_strategy (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_active boolean default true,

  -- Inputs manuales del founder (él los carga)
  founder_notes text,           -- reflexiones libres de la semana
  recent_decisions text,        -- decisiones que quiere compartir
  recent_mistakes text,         -- errores que quiere documentar
  references jsonb default '[]',-- links, libros, herramientas a comentar

  -- Métricas de Servy disponibles para el agente
  servy_metrics_snapshot jsonb default '{}',

  -- Insights de performance del contenido personal
  insights jsonb default '[]',
  current_rules jsonb default '{}',
  weekly_plan jsonb default '[]',
  changelog jsonb default '[]'
);
```

### 4.2 Tabla `posts` — el kanban (Servy + Founder)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Metadata del post
  title text not null,
  format text not null check (format in ('feed_image', 'story', 'reel', 'feed_carousel')),
  objective text not null check (objective in ('awareness', 'engagement', 'conversion', 'retention')),
  target text not null check (target in ('user', 'provider', 'both')),
  service_category text, -- 'plomeria', 'electricidad', 'cerrajeria', 'gas', 'aires', null=general
  scheduled_at timestamptz,

  -- Estado kanban
  status text not null default 'todo'
    check (status in ('todo', 'generating', 'review', 'approved', 'published', 'failed')),

  -- Contenido generado
  copy text,
  hashtags text[],
  cta_text text,
  image_prompt text,          -- prompt que se mandó a fal.ai
  image_url text,             -- URL en Supabase Storage
  image_urls text[],          -- variantes generadas (3 opciones)
  selected_image_index integer default 0,
  video_brief text,           -- para reels (fase 2)

  -- Publicación
  meta_post_id text,          -- ID del post en Meta una vez publicado
  published_at timestamptz,
  published_url text,

  -- Métricas (se actualizan 48hs después)
  metrics jsonb default '{}',
  -- {
  --   "reach": 0, "impressions": 0, "likes": 0,
  --   "comments": 0, "shares": 0, "saves": 0,
  --   "link_clicks": 0, "ctr": 0.0,
  --   "whatsapp_conversations": 0,   <- desde UTM tracking
  --   "engagement_rate": 0.0,
  --   "fetched_at": null
  -- }
  metrics_fetched_at timestamptz,

  -- Control
  approved_by text,           -- 'founder' o 'auto' (si se habilita en el futuro)
  rejection_reason text,
  generation_attempts integer default 0
);
```

### 4.3 Tabla `analytics_snapshots` — historial de métricas

```sql
create table analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id),
  snapshot_at timestamptz default now(),
  hours_after_publish integer,  -- 24, 48, 72, 168 (1 semana)
  metrics jsonb not null
);
```

### 4.4 Tabla `utm_events` — conversiones reales

```sql
create table utm_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  post_id uuid references posts(id),
  utm_source text,     -- 'instagram', 'facebook'
  utm_medium text,     -- 'social', 'story', 'reel'
  utm_campaign text,   -- slug del post
  event_type text,     -- 'whatsapp_open', 'page_view'
  session_id text,
  user_agent text
);
```

---

## 5. Estructura de carpetas del proyecto

```
servy-content-agent/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # layout del dashboard
│   │   ├── page.tsx                # kanban principal
│   │   ├── strategy/
│   │   │   └── page.tsx            # ver/editar archivo madre
│   │   ├── analytics/
│   │   │   └── page.tsx            # métricas y aprendizajes
│   │   └── post/
│   │       └── [id]/
│   │           └── page.tsx        # detalle de un post
│   ├── api/
│   │   ├── agent/
│   │   │   ├── analyze/route.ts    # POST — dispara ciclo de análisis
│   │   │   ├── generate/route.ts   # POST — genera contenido para un post
│   │   │   └── strategy/route.ts   # POST — actualiza archivo madre
│   │   ├── posts/
│   │   │   ├── route.ts            # GET lista, POST crear
│   │   │   └── [id]/
│   │   │       ├── route.ts        # GET, PATCH, DELETE
│   │   │       ├── approve/route.ts
│   │   │       ├── publish/route.ts
│   │   │       └── metrics/route.ts
│   │   ├── meta/
│   │   │   ├── publish/route.ts    # publica en Meta
│   │   │   └── insights/route.ts   # lee métricas de Meta
│   │   ├── utm/
│   │   │   └── track/route.ts      # recibe eventos UTM
│   │   └── cron/
│   │       ├── weekly/route.ts     # cron lunes 9am
│   │       └── metrics/route.ts    # cron cada 24hs
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── agents/
│   │   ├── analyst.ts              # agente analista (Gemini)
│   │   ├── generator.ts            # agente generador (Gemini + fal.ai)
│   │   └── prompts/
│   │       ├── brandbook.ts        # brandbook completo como string
│   │       ├── analyst.ts          # system prompt del analista
│   │       └── generator.ts        # system prompt del generador
│   ├── meta/
│   │   ├── publish.ts
│   │   └── insights.ts
│   ├── fal/
│   │   └── generate-image.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── notifications/
│       └── notify-approval.ts
├── components/
│   ├── kanban/
│   │   ├── Board.tsx
│   │   ├── Column.tsx
│   │   └── PostCard.tsx
│   ├── post/
│   │   ├── PostDetail.tsx
│   │   ├── ImagePicker.tsx
│   │   └── CopyEditor.tsx
│   └── ui/                         # componentes base
├── hooks/
│   ├── usePosts.ts
│   └── useStrategy.ts
└── types/
    └── index.ts                    # todos los tipos TypeScript
```

---

## 6. Agentes — comportamiento y prompts

### 6.1 Agente Analista

**Archivo**: `lib/agents/analyst.ts`
**Modelo**: `gemini-2.5-flash`
**Se dispara**: cron lunes 9am + 48hs post-publicación

**Input que recibe**:
```typescript
{
  posts: Post[],              // últimos 30 días
  current_strategy: Strategy, // archivo madre actual
  meta_insights: MetaInsights // datos crudos de Meta
}
```

**Output que debe devolver** (JSON estricto):
```typescript
{
  insights: Insight[],        // nuevos aprendizajes detectados
  updated_rules: Rules,       // reglas actualizadas
  weekly_plan: PlannedPost[], // plan para la semana siguiente
  changelog_entry: string     // descripción del cambio en lenguaje natural
}
```

**System prompt base** (en `lib/agents/prompts/analyst.ts`):
```
Sos el agente analista de contenido de Servy.

Tu rol es analizar el rendimiento de los posts publicados en Instagram y Facebook,
detectar patrones, y actualizar la estrategia de contenido.

CONTEXTO DE MARCA:
{{brandbook}}

DATOS DISPONIBLES:
- Posts de los últimos 30 días con sus métricas reales
- Insights actuales de la estrategia

TU TAREA:
1. Analizar qué formatos, horarios y temas tuvieron mejor performance
2. Identificar patrones con confianza > 0.6 para incluirlos como insights
3. Actualizar las reglas dinámicas (mejores días, horas, mix de formatos)
4. Generar el plan de posts para la semana siguiente

MÉTRICAS POR ORDEN DE IMPORTANCIA:
1. whatsapp_conversations (conversiones reales de negocio)
2. link_clicks + CTR (tráfico al chat)
3. engagement_rate (likes + comments + saves / reach)
4. reach (alcance)

REGLAS PARA EL PLAN SEMANAL:
- Mínimo 3 posts de feed por semana
- Mínimo 3 stories por semana
- 1 reel por semana (si hay datos que justifiquen el formato)
- Distribuir entre usuarios (70%) y proveedores (30%)
- Nunca dos posts del mismo formato el mismo día

Respondé ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown.
```

### 6.2 Agente Generador

**Archivo**: `lib/agents/generator.ts`
**Modelo**: `gemini-2.5-flash` (copy) + `fal.ai/flux-dev` (imagen)
**Se dispara**: cuando un post pasa a estado `generating`

**Input que recibe**:
```typescript
{
  post: Post,                 // tarjeta del kanban con metadata
  strategy: Strategy,         // archivo madre con brandbook + reglas
  reference_posts?: Post[]    // posts similares que funcionaron bien
}
```

**Output que debe devolver** (JSON estricto):
```typescript
{
  copy: string,               // caption completo
  hashtags: string[],         // entre 5 y 15 hashtags
  cta_text: string,           // texto del call to action
  image_prompt: string,       // prompt optimizado para fal.ai
  image_prompts: string[],    // 3 variantes del prompt (para generar 3 opciones)
  alt_copies: string[]        // 2 variantes del copy
}
```

**System prompt base** (en `lib/agents/prompts/generator.ts`):
```
Sos el agente generador de contenido de Servy.

Tu rol es crear copy e imágenes para posts de Instagram y Facebook
que respeten el brandbook de Servy y maximicen las conversaciones iniciadas en WhatsApp.

BRANDBOOK COMPLETO:
{{brandbook}}

REGLAS ACTUALES DE LA ESTRATEGIA:
{{current_rules}}

POSTS QUE MEJOR FUNCIONARON (referencia de estilo):
{{reference_posts}}

PARA CADA POST GENERADO:
- El copy debe empezar con el problema o beneficio, nunca con el nombre de la marca
- Máximo 150 palabras para feed, 30 palabras para story
- El CTA siempre lleva a WhatsApp
- Tono: directo, cálido, voseo argentino
- Nunca usar exclamaciones exageradas ni mayúsculas para urgencia

PARA LOS PROMPTS DE IMAGEN (fal.ai / Flux):
- Estilo fotorrealista, no ilustración
- Siempre incluir: "professional photography, clean background, bright natural light"
- Para servicios del hogar: mostrar el problema resuelto, no el problema
- Colores dominantes: blanco, verde (#16a34a), gris claro
- Sin texto en la imagen (el texto va en el copy)
- Sin logos en la imagen (se agrega en post-producción)

Respondé ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown.
```

---

## 7. API Routes — comportamiento esperado

### `POST /api/agent/generate`
Recibe `{ post_id: string }`. Cambia estado a `generating`, llama al agente generador, sube las 3 imágenes a Supabase Storage, guarda copy + URLs en el post, cambia estado a `review`, envía notificación de aprobación.

### `POST /api/agent/analyze`
Recibe `{ trigger: 'cron_weekly' | 'post_48h', post_id?: string }`. Lee datos relevantes de Supabase + Meta Insights, llama al agente analista, actualiza el archivo madre, si es `cron_weekly` crea las tarjetas de la semana en el kanban.

### `POST /api/posts/[id]/approve`
Recibe `{ selected_image_index: number, copy?: string }` (el copy puede ser editado antes de aprobar). Cambia estado a `approved`. Dispara `/api/meta/publish`.

### `POST /api/meta/publish`
Recibe `{ post_id: string }`. Lee el post aprobado, publica en Meta según el formato, guarda `meta_post_id` y `published_at`, cambia estado a `published`. Programa el job de métricas a 48hs.

### `GET /api/meta/insights`
Recibe `{ post_id: string }`. Lee métricas del post desde Meta Graph API. Actualiza `posts.metrics` y crea un `analytics_snapshot`.

### `POST /api/utm/track`
Recibe `{ utm_campaign, utm_source, utm_medium, event_type, session_id }`. Busca el post por `utm_campaign`, crea un `utm_event`, incrementa `metrics.whatsapp_conversations` si `event_type === 'whatsapp_open'`.

---

## 8. Frontend — Kanban

### 8.1 Columnas y estados

| Columna | Estado DB | Color | Descripción |
|---|---|---|---|
| To do | `todo` | Gris | Posts planificados por el agente, pendientes de generar |
| Generando | `generating` | Amarillo | El agente está trabajando |
| Para revisar | `review` | Azul | Listo para aprobación humana |
| Aprobado | `approved` | Verde claro | Aprobado, pendiente de publicar |
| Publicado | `published` | Verde | Live en Instagram/Facebook |
| Fallido | `failed` | Rojo | Error en generación o publicación |

### 8.2 PostCard — información visible en la tarjeta

```
[formato badge] [objetivo badge]
Título del post
Fecha programada · Categoría de servicio
[si está en review] thumbnail de la imagen generada
[métricas si está publicado] 📊 reach · ❤️ eng · 💬 convs
```

### 8.3 PostDetail — vista al hacer click

- Preview de las 3 imágenes generadas con selector
- Copy editable antes de aprobar
- Hashtags editables
- Botones: Aprobar / Rechazar (con campo de motivo) / Regenerar
- Si está publicado: métricas completas + link al post

### 8.4 Página de estrategia (`/strategy`)

- Vista read-only del archivo madre actual
- Timeline de versiones (changelog)
- Sección de insights acumulados con badge de confianza
- Reglas dinámicas actuales (mejores días, horarios, mix)
- Botón "Forzar análisis ahora"

### 8.5 Página de analytics (`/analytics`)

- Tabla de todos los posts publicados con métricas
- Gráfico de conversaciones WhatsApp por semana
- Top 3 posts por engagement
- Top 3 posts por conversiones
- Comparativa de formatos (feed vs story vs reel)

---

## 9. Notificaciones de aprobación

Cuando un post pasa a estado `review`, el sistema notifica al founder con:

**Por email (Resend)**:
```
Asunto: [Servy] Nuevo post listo para aprobar — {formato} {fecha}

{thumbnail de la imagen}
{copy generado}
{hashtags}

[Aprobar] [Rechazar] — links directos que abren la app
```

**Por WhatsApp (Twilio) — opcional**:
```
Servy Content Agent:
Nuevo post listo para aprobar 👀

📅 {fecha}
📱 {formato}
🎯 {objetivo}

Entrá a revisar: https://app.servy.lat/post/{id}
```

---

## 10. UTM tracking — cómo funciona

Cada post que se publica lleva un UTM en el link de la bio o en el swipe up:
```
https://wa.me/5491100000000?text=Hola&utm_source=instagram&utm_medium=story&utm_campaign={post_id}
```

El middleware de Next.js (`middleware.ts`) intercepta requests a `/track`, registra el evento y redirige al usuario a WhatsApp sin fricción. Esto permite saber exactamente qué post generó qué conversación.

---

## 11. Crons (Vercel Cron Jobs)

En `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/metrics",
      "schedule": "0 10 * * *"
    }
  ]
}
```

El cron de métricas (`/api/cron/metrics`) corre todos los días a las 10am. Busca posts publicados hace 24hs, 48hs y 7 días, les pide métricas a Meta, actualiza Supabase, y si el post tiene 48hs dispara el análisis post-publicación.

---

## 12. Orden de desarrollo recomendado

### Fase 1 — Base (semana 1)
1. Setup Next.js + Supabase + Tailwind
2. Schema de base de datos (migrations)
3. Types TypeScript
4. CRUD básico de posts
5. Kanban UI (sin drag & drop por ahora, solo columnas)
6. Brandbook cargado como string en `lib/agents/prompts/brandbook.ts`

### Fase 2 — Agente generador (semana 2)
7. Integración Gemini 2.0 Flash (Google AI SDK)
8. Agente generador — copy + hashtags
9. Integración fal.ai — generación de 3 variantes de imagen
10. Upload a Supabase Storage
11. Vista de aprobación con selector de imagen
12. Notificación por email (Resend)

### Fase 3 — Meta (semana 3)
13. Meta Graph API — publicación de feed images
14. Meta Graph API — publicación de stories
15. Meta Graph API — lectura de insights
16. UTM tracking middleware
17. Métricas en las tarjetas del kanban

### Fase 4 — Agente analista (semana 4)
18. Agente analista — leer datos y generar insights
19. Update del archivo madre
20. Creación automática de tarjetas desde el plan semanal
21. Crons de Vercel
22. Página de estrategia
23. Página de analytics

### Fase 5 — Pulido (semana 5)
24. Drag & drop en el kanban
25. Notificación por WhatsApp (Twilio)
26. Regeneración con feedback (el founder escribe por qué rechazó)
27. Historial de versiones del archivo madre
28. Reels / video brief (si fal.ai o Runway están listos)

---

## 12b. Variables de entorno adicionales — Fase 6

```
META_AD_ACCOUNT_ID=        # act_XXXXXXXXXX — se obtiene del Business Manager
META_SYSTEM_USER_TOKEN=    # token con permisos ads_management + ads_read
```

---

## 12c. Fase 6 — Campañas pagas con Meta Ads API (bloqueada hasta tener cuenta)

> ⚠️ Esta fase requiere cuenta de anunciante activa en Meta Business Manager
> con método de pago cargado y System User Token generado.
> No implementar hasta tener esas credenciales.

### Concepto
El agente analiza el performance orgánico de cada post 48hs después de publicado.
Si supera los umbrales de performance, genera una sugerencia de campaña paga.
El founder aprueba con un click desde el kanban. El agente ejecuta via Meta Ads API.

### Umbrales para sugerir pauta (configurables en DB)
```typescript
const BOOST_THRESHOLDS = {
  engagement_rate:        0.04,  // > 4%
  ctr:                    0.02,  // > 2%
  whatsapp_conversations: 3,     // > 3 orgánicas en 48hs
};
// Si cumple al menos 1 → candidato. Si cumple 2 o más → prioritario.
```

### Schema adicional — tabla `ad_campaigns`
```sql
create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Sugerencia del agente
  status text not null default 'suggested'
    check (status in ('suggested','approved','active','paused','completed','rejected')),
  
  agent_reasoning text,          -- por qué sugiere pautar este post
  suggested_budget_daily numeric, -- en ARS
  suggested_duration_days integer,
  suggested_objective text        -- 'messages', 'reach', 'link_clicks'
    check (suggested_objective in ('messages', 'reach', 'link_clicks')),
  suggested_audience jsonb,
  -- {
  --   "locations": ["Buenos Aires"],
  --   "age_min": 28, "age_max": 55,
  --   "genders": ["all"],
  --   "interests": ["home improvement", "real estate"]
  -- }
  estimated_ctr numeric,
  estimated_conversations integer,

  -- Lo que aprobó el founder (puede ajustar)
  approved_budget_daily numeric,
  approved_duration_days integer,
  approved_at timestamptz,

  -- Meta Ads IDs (se llenan al crear la campaña)
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,

  -- Métricas reales de la campaña
  spend_total numeric default 0,
  reach integer default 0,
  impressions integer default 0,
  link_clicks integer default 0,
  messages_started integer default 0,
  cost_per_message numeric,
  roas numeric,                   -- return on ad spend
  metrics_updated_at timestamptz
);
```

### Flujo completo
```
Post publicado
    ↓ (48hs después — cron)
Agente lee métricas orgánicas
    ↓
¿Supera umbrales? → NO → nada
    ↓ SÍ
Agente genera sugerencia de campaña
(reasoning + presupuesto + audiencia + objetivo)
    ↓
Notificación al founder
"Este post es candidato a pauta — ver sugerencia"
    ↓
Founder revisa en kanban → aprueba / ajusta / rechaza
    ↓ aprobado
POST /api/ads/create → Meta Ads API
Crea Campaign → Ad Set → Ad
    ↓
Campaña activa en Meta
    ↓ (cada 24hs mientras está activa)
Agente lee métricas de la campaña
Actualiza ad_campaigns.metrics
    ↓
Si cost_per_message > umbral → sugiere pausar
Si performance > benchmark → sugiere escalar budget
    ↓ (al completarse)
Agente registra aprendizaje en strategy.insights
"Posts de plomería urgente con foto de resultado
tienen CPM 40% menor que promedio"
```

### Nuevas API Routes — Fase 6
```
POST /api/ads/suggest          # analiza post y genera sugerencia
POST /api/ads/[id]/approve     # founder aprueba, opcionalmente ajusta budget
POST /api/ads/create           # crea la campaña en Meta Ads API
GET  /api/ads/[id]/metrics     # lee métricas de campaña activa
POST /api/ads/[id]/pause       # pausa campaña
POST /api/ads/[id]/scale       # aumenta budget
```

### Estructura Meta Ads API — jerarquía
```
Ad Account (act_XXXXXXXXXX)
  └── Campaign (objetivo: MESSAGES)
        └── Ad Set (audiencia + presupuesto + placement)
              └── Ad (creative: imagen del post + copy + CTA)
```

### Prerequisitos antes de implementar
- [ ] Meta Business Manager creado
- [ ] Página de Facebook e Instagram de Servy agregadas
- [ ] Cuenta publicitaria creada con método de pago
- [ ] System User generado con permisos `ads_management` y `ads_read`
- [ ] `META_AD_ACCOUNT_ID` y `META_SYSTEM_USER_TOKEN` en variables de entorno
- [ ] Al menos 10 posts publicados con métricas reales (el agente necesita histórico)

---

## 13. Consideraciones importantes para el agente de desarrollo

- **Nunca hardcodear credenciales**. Todas las keys van en `.env.local` y en Vercel Environment Variables.
- **El brandbook es el source of truth del agente**. Cualquier cambio de tono o estilo se hace en `lib/agents/prompts/brandbook.ts`, no en los system prompts individuales.
- **Los agentes siempre devuelven JSON**. Si la respuesta no parsea como JSON, reintentar máximo 2 veces antes de marcar el post como `failed`.
- **Meta Graph API tiene rate limits**. Implementar exponential backoff en todas las llamadas a Meta.
- **Supabase Storage para imágenes**. Nunca guardar URLs de fal.ai directamente — las imágenes se descargan y re-suben a Supabase para no depender de URLs externas que expiran.
- **El archivo madre nunca se borra**. Solo se versiona. Siempre `is_active = true` para el último, `is_active = false` para los anteriores.
- **RLS en Supabase**. Todas las tablas con Row Level Security habilitado. El service role key solo se usa en server-side routes.
- **Optimistic UI en el kanban**. Actualizar el estado localmente antes de confirmar con el servidor para una experiencia fluida.
