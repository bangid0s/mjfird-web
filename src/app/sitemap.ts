import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/data/projects";
import { getPosts } from "@/lib/data/blog";
import { getStorefrontServices } from "@/lib/data/services";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, services] = await Promise.all([getProjects(), getPosts(), getStorefrontServices()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/work",
    "/services",
    "/about",
    "/dance",
    "/blog",
    "/contact",
    "/resume",
    "/gallery",
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

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${BASE_URL}/work/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${BASE_URL}/services/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...legalRoutes, ...projectRoutes, ...postRoutes, ...serviceRoutes];
}
