import { useDroppable } from "@dnd-kit/core";

import type { Post, PostStatus } from "@/types";

import { DraggablePostCard } from "./DraggablePostCard";
import { PostCard } from "./PostCard";

type Props = {
  columnStatus: PostStatus;
  label: string;
  description: string;
  accentClass: string;
  headerClass: string;
  posts: Post[];
  onStatusChange: (id: string, status: PostStatus) => void;
  onGeneratePost?: (id: string) => void;
  generatingPostId?: string | null;
  onPublishPost?: (id: string) => void;
  publishingPostId?: string | null;
  enableDrag?: boolean;
};

export function Column({
  columnStatus,
  label,
  description,
  accentClass,
  headerClass,
  posts,
  onStatusChange,
  onGeneratePost,
  generatingPostId,
  onPublishPost,
  publishingPostId,
  enableDrag,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnStatus}`,
  });

  const Card = enableDrag ? DraggablePostCard : PostCard;

  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-xl border-2 ${accentClass}`}
    >
      <header className={`rounded-t-lg px-3 py-2 ${headerClass}`}>
        <h2 className="text-sm font-semibold">{label}</h2>
        <p className="text-[11px] opacity-90">{description}</p>
        <p className="mt-1 text-xs font-medium opacity-80">{posts.length}</p>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] max-h-[calc(100vh-12rem)] flex-col gap-2 overflow-y-auto p-2 ${
          isOver ? "rounded-b-lg bg-emerald-50/50 ring-2 ring-emerald-200/60 ring-inset"
          : ""
        }`}
      >
        {posts.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-zinc-400">Vacío</p>
        ) : (
          posts.map((p) => (
            <Card
              key={p.id}
              post={p}
              onStatusChange={onStatusChange}
              onGenerate={onGeneratePost}
              generateBusy={generatingPostId === p.id}
              onPublish={onPublishPost}
              publishBusy={publishingPostId === p.id}
            />
          ))
        )}
      </div>
    </section>
  );
}
