import type { Post, VideoContentType, VideoTone } from "@/types";

const VIDEO_CONTENT: VideoContentType[] = [
  "provider_working",
  "user_receiving",
  "both",
];
const VIDEO_TONES: VideoTone[] = ["urgent", "aspirational", "educational"];

export function isVideoPostFormat(
  format: Post["format"],
): format is "reel" | "story" {
  return format === "reel" || format === "story";
}

export function postHasVideoCreationFields(post: Post): boolean {
  if (!isVideoPostFormat(post.format)) return false;
  const topic = (post.brief ?? "").trim();
  if (!topic || topic.length > 200) return false;
  if (
    !post.video_content_type ||
    !VIDEO_CONTENT.includes(post.video_content_type)
  ) {
    return false;
  }
  if (!post.video_tone || !VIDEO_TONES.includes(post.video_tone)) {
    return false;
  }
  if (
    post.video_duration_seconds !== 15 &&
    post.video_duration_seconds !== 30 &&
    post.video_duration_seconds !== 60
  ) {
    return false;
  }
  const cat = (post.video_category ?? "").trim();
  if (!cat) return false;
  return true;
}
