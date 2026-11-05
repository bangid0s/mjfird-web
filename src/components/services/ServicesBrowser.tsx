"use client";

import { useState } from "react";
import FilterChips from "@/components/ui/FilterChips";
import ServiceCard from "@/components/services/ServiceCard";
import Reveal from "@/components/motion/Reveal";
import type { StorefrontService } from "@/lib/data/services";

export default function ServicesBrowser({ services }: { services: StorefrontService[] }) {
  const [active, setActive] = useState("All");
  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
  const visible = active === "All" ? services : services.filter((s) => s.category === active);

  return (
    <div className="flex flex-col gap-10">
      {categories.length > 1 && <FilterChips options={categories} onChange={setActive} />}
      <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((service, i) => (
          <Reveal key={service.id} delay={(i % 3) * 70}>
            <ServiceCard service={service} priority={i < 3} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
