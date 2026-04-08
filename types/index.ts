/**
 * Tipos alineados al schema Supabase (spec §4).
 * Los campos jsonb usan tipos estructurados donde el spec da forma; el resto es Json flexible.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// strategy
// ---------------------------------------------------------------------------

export interface StrategyBrandContext {
  tone?: string;
  colors?: Record<string, string>;
  logo_rules?: string;
  voice_rules?: string;
  dont_do?: string[];
  [key: string]: Json | undefined;
}

export interface StrategyInsight {
  date: string;
  finding: string;
  confidence: number;
}

export interface StrategyCurrentRules {
  best_days?: string[];
  best_times?: string[];
  best_formats?: string[];
  avoid?: string[];
  weekly_mix?: Record<string, number>;
  [key: string]: Json | undefined;
}

export type StrategyWeeklyPlanItem = Record<string, Json | undefined>;

export interface StrategyChangelogEntry {
  at?: string;
  description?: string;
  version?: number;
  [key: string]: Json | undefined;
}

export interface Strategy {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  brand_context: StrategyBrandContext;
  insights: StrategyInsight[];
  current_rules: StrategyCurrentRules;
  weekly_plan: StrategyWeeklyPlanItem[];
  changelog: StrategyChangelogEntry[] | string[];
}

export type StrategyInsert = Omit<
  Strategy,
  "id" | "created_at" | "updated_at" | "version" | "is_active"
> & {
  id?: string;
  version?: number;
  is_active?: boolean;
};

export type StrategyUpdate = Partial<
  Omit<Strategy, "id" | "created_at">
>;

// ---------------------------------------------------------------------------
// founder_strategy
// ---------------------------------------------------------------------------

export type FounderReferenceItem = Record<string, Json | undefined>;

export interface FounderStrategy {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  founder_notes: string | null;
  recent_decisions: string | null;
  recent_mistakes: string | null;
  references: FounderReferenceItem[];
  servy_metrics_snapshot: Record<string, Json | undefined>;
  insights: StrategyInsight[];
  current_rules: StrategyCurrentRules;
  weekly_plan: StrategyWeeklyPlanItem[];
  changelog: StrategyChangelogEntry[] | string[];
}

export type FounderStrategyInsert = Omit<
  FounderStrategy,
  "id" | "created_at" | "updated_at" | "version" | "is_active"
> & {
  id?: string;
  version?: number;
  is_active?: boolean;
};

export type FounderStrategyUpdate = Partial<
  Omit<FounderStrategy, "id" | "created_at">
>;

// ---------------------------------------------------------------------------
// posts
// ---------------------------------------------------------------------------

export type PostFormat = "feed_image" | "story" | "reel" | "feed_carousel";

export type PostObjective =
  | "awareness"
  | "engagement"
  | "conversion"
  | "retention";

export type PostTarget = "user" | "provider" | "both";

export type PostStatus =
  | "todo"
  | "generating"
  | "review"
  | "approved"
  | "published"
  | "failed";

export type ServiceCategory =
  | "plomeria"
  | "electricidad"
  | "cerrajeria"
  | "gas"
  | "aires"
  | "general"
  | null;

export type VideoContentType = "provider_working" | "user_receiving" | "both";

export type VideoTone = "urgent" | "aspirational" | "educational";

export type VideoDurationTarget = 15 | 30 | 60;

export interface PostMetrics {
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  link_clicks?: number;
  ctr?: number;
  whatsapp_conversations?: number;
  engagement_rate?: number;
  fetched_at?: string | null;
  [key: string]: Json | undefined;
}

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  format: PostFormat;
  objective: PostObjective;
  target: PostTarget;
  service_category: string | null;
  scheduled_at: string | null;
  status: PostStatus;
  copy: string | null;
  hashtags: string[] | null;
  cta_text: string | null;
  image_prompt: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  selected_image_index: number;
  video_brief: string | null;
  /** Contexto libre del founder para guiar al generador (brief inicial). */
  brief: string | null;
  meta_post_id: string | null;
  published_at: string | null;
  published_url: string | null;
  metrics: PostMetrics;
  metrics_fetched_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  generation_attempts: number;
  /** Contexto del founder para la próxima regeneración (Fase 5). */
  regeneration_feedback: string | null;

  video_url: string | null;
  /** Duración del clip generado en fal (p. ej. 5 o 10). */
  video_duration: number | null;
  video_prompt: string | null;
  video_content_type: VideoContentType | null;
  video_tone: VideoTone | null;
  video_category: string | null;
  video_duration_seconds: VideoDurationTarget | null;
}

export type PostInsert = Omit<
  Post,
  | "id"
  | "created_at"
  | "updated_at"
  | "status"
  | "metrics"
  | "selected_image_index"
  | "generation_attempts"
  | "regeneration_feedback"
  | "brief"
  | "video_url"
  | "video_duration"
  | "video_prompt"
  | "video_content_type"
  | "video_tone"
  | "video_category"
  | "video_duration_seconds"
> & {
  id?: string;
  status?: PostStatus;
  metrics?: PostMetrics;
  selected_image_index?: number;
  generation_attempts?: number;
  regeneration_feedback?: string | null;
  brief?: string | null;
  video_url?: string | null;
  video_duration?: number | null;
  video_prompt?: string | null;
  video_content_type?: VideoContentType | null;
  video_tone?: VideoTone | null;
  video_category?: string | null;
  video_duration_seconds?: VideoDurationTarget | null;
};

export type PostUpdate = Partial<Omit<Post, "id" | "created_at">>;

// ---------------------------------------------------------------------------
// analytics_snapshots
// ---------------------------------------------------------------------------

export interface AnalyticsSnapshot {
  id: string;
  post_id: string | null;
  snapshot_at: string;
  hours_after_publish: number | null;
  metrics: Record<string, Json | undefined>;
}

export type AnalyticsSnapshotInsert = Omit<AnalyticsSnapshot, "id" | "snapshot_at"> & {
  id?: string;
  snapshot_at?: string;
};

// ---------------------------------------------------------------------------
// utm_events
// ---------------------------------------------------------------------------

export type UtmEventType = "whatsapp_open" | "page_view" | string;

export interface UtmEvent {
  id: string;
  created_at: string;
  post_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  event_type: string | null;
  session_id: string | null;
  user_agent: string | null;
}

export type UtmEventInsert = Omit<UtmEvent, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// Database (vista única para tipar createClient — extensible en fases siguientes)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      strategy: {
        Row: Strategy;
        Insert: StrategyInsert;
        Update: StrategyUpdate;
      };
      founder_strategy: {
        Row: FounderStrategy;
        Insert: FounderStrategyInsert;
        Update: FounderStrategyUpdate;
      };
      posts: {
        Row: Post;
        Insert: PostInsert;
        Update: PostUpdate;
      };
      analytics_snapshots: {
        Row: AnalyticsSnapshot;
        Insert: AnalyticsSnapshotInsert;
        Update: Partial<AnalyticsSnapshotInsert>;
      };
      utm_events: {
        Row: UtmEvent;
        Insert: UtmEventInsert;
        Update: Partial<UtmEventInsert>;
      };
    };
  };
}
