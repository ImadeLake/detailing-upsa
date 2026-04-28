"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { CountriesMultiSelect } from "./CountriesMultiSelect";
import { DateRangePicker } from "./DateRangePicker";

type Props = {
  defaultFrom?: string;
  defaultTo?: string;
  countryOptions: { name: string; events: number }[];
  selectedCountries: string[];
};

export function FiltersBar({
  defaultFrom,
  defaultTo,
  countryOptions,
  selectedCountries,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState<string | undefined>(defaultFrom);
  const [to, setTo] = useState<string | undefined>(defaultTo);
  const [countries, setCountries] = useState<string[]>(selectedCountries);

  // Skip the navigation triggered by initial mount.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    for (const c of countries) params.append("countries", c);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }, [from, to, countries, router]);

  return (
    <div className="card card-elevated p-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <span className="label mb-1">Plage de dates</span>
        <DateRangePicker
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
        />
      </div>
      <div className="flex flex-col">
        <span className="label mb-1">Pays</span>
        <CountriesMultiSelect
          options={countryOptions}
          selected={selectedCountries}
          onChange={setCountries}
        />
      </div>
      <div className="ml-auto">
        <Link href="/" className="btn-ghost inline-flex items-center gap-2">
          <RefreshCcw size={13} /> Réinitialiser
        </Link>
      </div>
    </div>
  );
}
