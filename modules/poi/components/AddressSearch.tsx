"use client";

import { useEffect, useRef, useState } from "react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressSearchProps {
  onSelect: (lat: number, lng: number) => void;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen]           = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: value,
          format: "json",
          limit: "5",
          countrycodes: "vn",
          "accept-language": "vi,en",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept-Language": "vi,en" } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const select = (r: NominatimResult) => {
    onSelect(parseFloat(r.lat), parseFloat(r.lon));
    setQuery(r.display_name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Tìm địa chỉ… (dùng Nominatim / OpenStreetMap)"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
        />
        {searching && (
          <svg className="w-4 h-4 text-orange-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {query && !searching && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Clear"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => select(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-orange-50 text-gray-700 truncate"
                title={r.display_name}
              >
                {r.display_name}
              </button>
            </li>
          ))}
          <li className="px-4 py-1.5 text-xs text-gray-400 border-t border-gray-100">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> contributors · Geocoding by <a href="https://nominatim.org" target="_blank" rel="noreferrer" className="underline">Nominatim</a>
          </li>
        </ul>
      )}

      {open && results.length === 0 && !searching && query.trim() && (
        <div className="absolute z-[1000] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
          Không tìm thấy kết quả.
        </div>
      )}
    </div>
  );
}
