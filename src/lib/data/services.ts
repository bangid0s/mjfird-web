import { createPublicClient } from "@/lib/supabase/public";
import { services as placeholderServices, type Service } from "@/lib/placeholder-data";
import { isSupabaseConfigured } from "./config";
import type { ServiceRow } from "@/lib/supabase/types";
import { parseGallery } from "@/lib/admin/form-parse";
import { getServiceCovers } from "./gallery";
import {
  addonSchema,
  backgroundSchema,
  faqSchema,
  packageSchema,
  DEFAULT_LICENSES,
  parseLicenses,
  parseList,
  questionSchema,
  type Availability,
  type ServiceLicense,
  type ServiceAddon,
  type ServiceBackground,
  type ServiceFaq,
  type ServicePackage,
  type ServiceQuestion,
} from "@/lib/services/storefront";

function mapRow(row: ServiceRow): Service {
  return {
    title: row.title,
    description: row.description ?? "",
    deliverables: row.deliverables ?? [],
    imageUrl: row.image_url ?? undefined,
  };
}

/** Homepage services section: title, blurb, deliverables. */
export async function getServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) return placeholderServices;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return placeholderServices;
    return data.map(mapRow);
  } catch {
    return placeholderServices;
  }
}

/* ---------------- Commission storefront ---------------- */

export type StorefrontService = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  details: string;
  coverUrl?: string;
  availability: Availability;
  slotsTotal: number | null;
  slotsTaken: number;
  packages: ServicePackage[];
  addons: ServiceAddon[];
  backgrounds: ServiceBackground[];
  licenses: ServiceLicense[];
  samples: { url: string; alt: string }[];
  willDraw: string[];
  wontDraw: string[];
  faq: ServiceFaq[];
  terms: string;
  questions: ServiceQuestion[];
};

/**
 * `galleryCover` is the first gallery image filed under this service. It wins
 * over the manual samples, so a service with no cover of its own still shows
 * the artwork its gallery samples lead with.
 */
export function mapStorefrontRow(row: ServiceRow, galleryCover?: string): StorefrontService {
  const samples = parseGallery(JSON.stringify(row.samples ?? []));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category ?? "",
    description: row.description ?? "",
    details: row.details ?? "",
    coverUrl: row.image_url ?? galleryCover ?? samples[0]?.url,
    availability: row.availability ?? "open",
    slotsTotal: row.slots_total ?? null,
    slotsTaken: row.slots_taken ?? 0,
    packages: parseList(packageSchema, row.packages),
    addons: parseList(addonSchema, row.addons),
    backgrounds: parseList(backgroundSchema, row.backgrounds),
    licenses: parseLicenses(row.licenses),
    samples,
    willDraw: row.will_draw ?? [],
    wontDraw: row.wont_draw ?? [],
    faq: parseList(faqSchema, row.faq),
    terms: row.terms ?? "",
    questions: parseList(questionSchema, row.questions),
  };
}

export async function getStorefrontServices(): Promise<StorefrontService[]> {
  if (!isSupabaseConfigured) return placeholderStorefront;
  try {
    const supabase = createPublicClient();
    const [{ data, error }, covers] = await Promise.all([
      supabase.from("services").select("*").eq("status", "published").order("sort_order", { ascending: true }),
      getServiceCovers(),
    ]);
    if (error || !data) return [];
    return (data as ServiceRow[]).map((row) => mapStorefrontRow(row, covers.get(row.id)));
  } catch {
    return [];
  }
}

export async function getStorefrontService(slug: string): Promise<StorefrontService | null> {
  if (!isSupabaseConfigured) return placeholderStorefront.find((s) => s.slug === slug) ?? null;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as ServiceRow;
    const cover = row.image_url ? undefined : (await getServiceCovers()).get(row.id);
    return mapStorefrontRow(row, cover);
  } catch {
    return null;
  }
}

/*
  Shown only when Supabase isn't configured (local preview). A configured site
  with no published services shows an honest empty state instead — never fake
  listings to real clients.
*/
const placeholderStorefront: StorefrontService[] = [
  {
    id: "demo-character",
    slug: "character-illustration",
    title: "Character Illustration",
    category: "Illustration",
    description: "Original characters, OCs, and personas — painted with a clean, cinematic finish.",
    details:
      "Send me your character sheet, a few references, and the mood you're after. I'll start with a rough sketch for approval, then move to line, color, and render.\n\nEvery tier includes a high-res PNG and a web-ready version.",
    availability: "open",
    slotsTotal: 5,
    slotsTaken: 2,
    packages: [
      { id: "bust", name: "Bust", description: "Head and shoulders.", price: 60, delivery_days: 10, revisions: 2, features: ["1 character", "Simple background", "High-res PNG"], extra_characters_max: 4 },
      { id: "half", name: "Half body", description: "Waist up, with a pose.", price: 95, delivery_days: 14, revisions: 2, features: ["1 character", "Simple background", "High-res PNG", "Sketch process file"], extra_characters_max: 4 },
      { id: "full", name: "Full body", description: "Full figure, dynamic pose.", price: 140, delivery_days: 21, revisions: 3, features: ["1 character", "Simple background", "High-res PNG", "Sketch process file", "Timelapse"], extra_characters_max: 4 },
    ],
    addons: [],
    backgrounds: [
      { id: "none", name: "No background", description: "Flat color or transparent PNG.", price: 0 },
      { id: "simple", name: "Simple background", description: "Gradient, pattern or soft shapes.", price: 15 },
      { id: "detailed", name: "Detailed background", description: "A painted scene instead of a flat backdrop.", price: 40 },
    ],
    licenses: DEFAULT_LICENSES,
    samples: [],
    willDraw: ["Original characters", "Fan art", "Armor & mecha", "Fantasy creatures"],
    wontDraw: ["NSFW", "Hate or harassment", "Real people without consent"],
    faq: [
      { q: "How does payment work?", a: "Send a request first. Once I accept it, you'll get a payment link — I only start after payment." },
      { q: "Can I request changes?", a: "Yes — each tier includes a set number of revisions at the sketch and color stages." },
    ],
    terms: "Personal use only unless the commercial license add-on is purchased. I may share the finished piece in my portfolio unless we agree otherwise.",
    questions: [
      { id: "refs", label: "Reference links", type: "long", options: [], required: true, help: "Character sheets, Pinterest boards, anything that helps." },
      { id: "mood", label: "Mood", type: "select", options: ["Heroic", "Calm", "Dark", "Playful"], required: false, help: "" },
    ],
  },
  {
    id: "demo-brand",
    slug: "brand-identity",
    title: "Brand Identity",
    category: "Design",
    description: "A complete visual identity — logo, type, color, and a kit you can actually use.",
    details: "For creators, crews, and small studios. We start with a short questionnaire, then two directions to choose from.",
    availability: "waitlist",
    slotsTotal: null,
    slotsTaken: 0,
    packages: [
      { id: "starter", name: "Starter", description: "Logo and basics.", price: 450, delivery_days: 21, revisions: 2, features: ["Primary logo", "Color palette", "Type pairing"], extra_characters_max: 0 },
      { id: "complete", name: "Complete", description: "A full system.", price: 1200, delivery_days: 35, revisions: 3, features: ["Logo suite", "Color & type system", "Social kit", "Brand guide PDF"], extra_characters_max: 0 },
    ],
    addons: [{ id: "rush", name: "Rush delivery", description: "Halves the timeline.", price: 300 }],
    backgrounds: [],
    licenses: DEFAULT_LICENSES,
    samples: [],
    willDraw: [],
    wontDraw: [],
    faq: [],
    terms: "",
    questions: [],
  },
];
