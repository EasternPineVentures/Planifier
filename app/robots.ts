import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/appUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/plan/new", "/plans", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
