/** @type {import('next').NextConfig} */

function supabaseImageRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const host = new URL(raw).hostname;
    if (!host) return [];
    return [
      {
        protocol: "https",
        hostname: host,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig = {
  images: {
    remotePatterns: supabaseImageRemotePattern(),
  },
};

export default nextConfig;
