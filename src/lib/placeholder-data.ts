export type Project = {
  slug: string;
  title: string;
  client: string;
  year: string;
  role: string;
  category: string;
  hook: string;
  template: "editorial" | "immersive" | "systems";
  featured: boolean;
  cover: string;
  gallery?: { url: string; alt?: string }[];
  narrative: {
    context: string;
    move: string;
    build: string;
    result: string;
  };
};

export const projects: Project[] = [
  {
    slug: "riso-battle-flyers",
    title: "Riso Battle Flyers",
    client: "Undercut Sessions",
    year: "2025",
    role: "Art direction, print, web",
    category: "Brand / Print",
    hook: "A flyer system for a monthly cypher, printed two colors deep and built to be photocopied to death.",
    template: "systems",
    featured: true,
    cover: "/placeholder/project-01.jpg",
    narrative: {
      context:
        "Undercut Sessions runs a monthly cypher out of a car park in the city center. They needed a flyer system that could be reprinted cheaply every month without losing identity.",
      move: "Design a two-color riso system — one fixed ink, one that rotates monthly — so every flyer is recognizably Undercut but never repeats.",
      build: "Built a modular grid of stamps, hand-set type, and a rotating accent-ink library, all laid out in a template the organizers can fill in themselves in under ten minutes.",
      result: "Eight months of flyers, zero design requests back to me, and a stack of them taped to the wall of the venue.",
    },
  },
  {
    slug: "kinetic-set-identity",
    title: "Kinetic Set Identity",
    client: "Boiler Room x KL",
    year: "2024",
    role: "Motion, brand identity",
    category: "Motion / Identity",
    hook: "A live-visuals system that reacts to BPM in real time — built to run on a laptop backstage.",
    template: "immersive",
    featured: true,
    cover: "/placeholder/project-02.jpg",
    narrative: {
      context: "A one-night showcase needed a visual identity that could run live behind six different DJs without looking like generic VJ software.",
      move: "Treat the identity as a rhythm instrument — typography and shape that snap to the beat instead of just pulsing with it.",
      build: "Built a lightweight web-based visuals rig (Three.js + Web Audio) that reads BPM in real time and drives type composition on a loop.",
      result: "Ran without a single dropped frame across a six-hour set, and the reel clipped from the night is still the top performer on their page.",
    },
  },
  {
    slug: "footwork-commerce",
    title: "Footwork Commerce",
    client: "Sole Cypher",
    year: "2024",
    role: "Product design, front-end build",
    category: "Product / Web",
    hook: "A sneaker resale storefront redesigned around how breakers actually shop — fast, visual, no fluff.",
    template: "editorial",
    featured: true,
    cover: "/placeholder/project-03.jpg",
    narrative: {
      context: "Sole Cypher's old storefront was a generic e-commerce template — slow, cluttered, and indistinguishable from any other resale shop.",
      move: "Cut the catalog UI down to what a buyer actually scans for — size, condition, price — and get out of the way.",
      build: "Rebuilt the storefront in Next.js with an image-first grid, instant filters, and a checkout flow trimmed to three steps.",
      result: "Page load cut from 4.1s to 1.2s LCP, and conversion on mobile — where most of their traffic lives — is up double digits.",
    },
  },
  {
    slug: "cypher-radio",
    title: "Cypher Radio",
    client: "Personal project",
    year: "2023",
    role: "Full-stack build",
    category: "Product",
    hook: "A streaming archive of battle sets, tagged by BPM and era, built to dig like a crate.",
    template: "editorial",
    featured: false,
    cover: "/placeholder/project-04.jpg",
    narrative: {
      context: "Battle footage and breaks mixes are scattered across YouTube, forums, and hard drives with no way to browse by feel.",
      move: "Treat the archive like a record crate — browse by BPM, era, and region instead of a generic search bar.",
      build: "A Next.js + Supabase app with a tagging pipeline, waveform previews, and a queue that behaves like a real DJ set.",
      result: "Still growing as a side project — a few hundred tracks in and it's become my own go-to for finding breaks to dance to.",
    },
  },
];

export type Service = {
  title: string;
  description: string;
  deliverables: string[];
};

export const services: Service[] = [
  {
    title: "Brand & Art Direction",
    description: "Identity systems for people and crews who don't want to look like everyone else.",
    deliverables: ["Visual identity", "Type & color systems", "Flyer / social kits"],
  },
  {
    title: "Web Design & Build",
    description: "Portfolio and product sites with real motion craft and real performance engineering.",
    deliverables: ["Design system", "Next.js build", "CMS handover"],
  },
  {
    title: "Motion & Interaction",
    description: "Signature interaction moments, scroll systems, and microinteraction libraries.",
    deliverables: ["Motion language", "Prototyping", "Implementation"],
  },
];

export const process: { title: string; description: string }[] = [
  { title: "Discovery", description: "A working session to pin down goals, audience, and the one thing the site has to do." },
  { title: "Direction", description: "Two design directions, explored fast, so we agree on a point of view before pixels get precious." },
  { title: "Build", description: "Design system first, then pages — motion and performance engineered in from the start, not bolted on." },
  { title: "Launch", description: "QA across devices, a short handover walkthrough, and you own everything — no lock-in." },
];

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

export const testimonials: Testimonial[] = [
  {
    quote: "MJFIRD builds the way he dances — deliberate, precise, nothing wasted.",
    name: "A. Reyes",
    role: "Undercut Sessions",
  },
  {
    quote: "The only designer I've worked with who ships motion that actually helps the page load faster, not slower.",
    name: "K. Tan",
    role: "Boiler Room KL",
  },
  {
    quote: "Gave our storefront a pulse. Conversions up, bounce down, and it finally looks like us.",
    name: "D. Osei",
    role: "Sole Cypher",
  },
];

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  body: string[];
  cover?: string;
};

export const posts: Post[] = [
  {
    slug: "designing-like-you-dance",
    title: "Designing like you dance",
    excerpt: "Notes on carrying rhythm and restraint from the cypher into the browser.",
    date: "2026-04-02",
    readTime: "6 min",
    body: [
      "Every breaker learns the same lesson eventually: the move that looks effortless is the one you've cut everything unnecessary out of. The same is true on a screen.",
      "When I'm design a page, I ask the same question I ask before stepping into a circle — what's the one thing I actually need to say here? Everything else is noise.",
      "Restraint isn't the absence of a statement. It's making sure the one statement you make actually lands.",
    ],
  },
  {
    slug: "performance-budget-for-motion-heavy-sites",
    title: "A performance budget for motion-heavy sites",
    excerpt: "How to ship GSAP, Lenis, and a custom cursor without blowing your Core Web Vitals.",
    date: "2026-02-14",
    readTime: "8 min",
    body: [
      "Motion-heavy sites get a bad reputation for being slow, but the libraries aren't usually the problem — unmanaged JavaScript is.",
      "The short version: code-split anything that isn't needed for first paint, isolate heavy work (WebGL, particle systems) behind an intersection observer, and always ship a static, reduced-motion fallback.",
      "If a page misses its performance budget, it doesn't ship — no exceptions, no matter how good the animation looks in isolation.",
    ],
  },
];
