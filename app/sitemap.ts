import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/appUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getAppOrigin(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
