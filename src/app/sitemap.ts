import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/data/projects";
import { getPosts } from "@/lib/data/blog";
import { getStorefrontServices } from "@/lib/data/services";
import { getGalleryItems } from "@/lib/data/gallery";
import { SITE_URL } from "@/lib/site-url";
import { sitemapImages } from "@/lib/sitemap-images";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, services, gallery] = await Promise.all([
    getProjects(),
    getPosts(),
    getStorefrontServices(),
    getGalleryItems(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/work",
    "/services",
    "/studios",
    "/about",
    "/dance",
    "/blog",
    "/contact",
    "/resume",
    "/gallery",
    "/reviews",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const legalRoutes: MetadataRoute.Sitemap = ["/privacy", "/terms"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date("2026-11-10"),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // Each work page lists its artwork, so Google Images ties every piece to
  // the page it belongs on (and to this domain).
  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${BASE_URL}/work/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    images: sitemapImages([p.cover, ...(p.gallery ?? []).map((g) => g.url)]),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    images: sitemapImages([p.cover]),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${BASE_URL}/services/${s.slug}`,
    lastModified: new Date(),
    images: sitemapImages([s.coverUrl]),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const galleryRoutes: MetadataRoute.Sitemap = gallery
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${BASE_URL}/gallery/${item.slug}`,
      lastModified: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
      images: sitemapImages([item.imageUrl]),
    }));

  return [...staticRoutes, ...legalRoutes, ...projectRoutes, ...postRoutes, ...serviceRoutes, ...galleryRoutes];
}
