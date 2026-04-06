"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { Post, PostStatus } from "@/types";

import { PostCard } from "./PostCard";

type Props = {
  post: Post;
  onStatusChange: (id: string, status: PostStatus) => void;
  onGenerate?: (id: string) => void;
  generateBusy?: boolean;
  onPublish?: (id: string) => void;
  publishBusy?: boolean;
};

export function DraggablePostCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: props.post.id });

  const style = transform ?
      { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 opacity-60" : ""}
    >
      <PostCard
        {...props}
        dragHandle={{ attributes, listeners }}
      />
    </div>
  );
}
