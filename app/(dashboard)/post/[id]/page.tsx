import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostDetailForm } from "@/components/post/PostDetailForm";
import { createServiceClient } from "@/lib/supabase/service";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("posts")
      .select("title")
      .eq("id", params.id)
      .maybeSingle();
    const title =
      data && typeof (data as { title?: string }).title === "string" ?
        (data as { title: string }).title.slice(0, 80)
      : "Post";
    return { title };
  } catch {
    return { title: "Post" };
  }
}

export default async function PostPage({ params }: PageProps) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !data) {
      notFound();
    }

    return (
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-zinc-500">Cargando post…</p>
        }
      >
        <PostDetailForm initialPost={data as Post} />
      </Suspense>
    );
  } catch {
    notFound();
  }
}
