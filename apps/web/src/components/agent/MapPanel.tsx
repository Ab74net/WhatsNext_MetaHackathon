"use client";

// The live map: fire perimeters, live alert areas, and the places the assistant found.
// MapLibre GL with OpenFreeMap vector tiles (OpenStreetMap data, no API key).

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { Clock, ExternalLink, Info, MapPin, Navigation, Phone, X } from "lucide-react";
import type { Alert, Resource, ResourceKind, Scenario } from "@shared/types";

export const KIND_STYLE: Record<ResourceKind, { color: string; label: string; icon: string }> = {
  shelter: { color: "#4f7f4b", label: "Shelter", icon: "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 14h18M7 10V7h4v3" },
  clinic: { color: "#b5382a", label: "Hospital", icon: "M12 6v12M6 12h12" },
  recovery_center: { color: "#3f6f96", label: "Recovery help", icon: "M4 20V9l8-5 8 5v11M9 20v-6h6v6" },
  animal_shelter: { color: "#8a5a2b", label: "Animals", icon: "M8 13a4 4 0 0 0 8 0c0-2-2-4-4-4s-4 2-4 4zM6 8.5a1.5 1.5 0 1 0 0-.01M18 8.5a1.5 1.5 0 1 0 0-.01M9.5 5a1.5 1.5 0 1 0 0-.01M14.5 5a1.5 1.5 0 1 0 0-.01" },
};
const FIRE = "#ff7a1a";
const ALERT = "#ff4d4f";
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

// Inline raster style: satellite imagery plus a place-name overlay. No style JSON,
// sprite or font downloads, so the first tiles appear quickly.
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    imagery: {
      type: "raster" as const, tileSize: 256, maxzoom: 19,
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster" as const, tileSize: 256, maxzoom: 19,
      tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
      attribution: "Labels © Esri",
    },
  },
  layers: [
    { id: "imagery", type: "raster" as const, source: "imagery" },
    { id: "labels", type: "raster" as const, source: "labels" },
  ],
};

function pinElement(kind: ResourceKind): HTMLElement {
  // MapLibre positions the marker by setting `transform` on this root element, so all
  // styling (including the selected-state scale) goes on the inner .map-pin.
  const { color, icon } = KIND_STYLE[kind];
  const root = document.createElement("button");
  root.type = "button";
  root.style.cssText = "background:none;border:0;padding:0;cursor:pointer;";
  const pin = document.createElement("span");
  pin.className = "map-pin";
  pin.style.cssText = `width:34px;height:34px;border-radius:50%;background:${color};border:3px solid #fff;
    box-shadow:0 2px 6px rgb(0 0 0 / .35);display:flex;align-items:center;justify-content:center;transition:transform .15s;`;
  pin.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>`;
  root.appendChild(pin);
  return root;
}

export function MapPanel({ scenario, resources, liveAlerts, replay, selectedId, onSelect }: {
  scenario: Scenario | null;
  resources: Resource[];
  liveAlerts: Alert[];
  replay: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const selected = resources.find((r) => r.id === selectedId) ?? null;
  // Marker click handlers are created once per set of places; read the latest callback.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once the scenario (center and fire perimeters) is known.
  useEffect(() => {
    if (!scenario || !container.current || map.current) return;
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      ml.setWorkerUrl("/maplibre-gl-worker.mjs"); // copied into public/ by scripts/copy-maplibre-worker.mjs
      const m = new ml.Map({
        container: container.current,
        style: SATELLITE_STYLE,
        center: scenario.center,
        zoom: scenario.zoom,
        maxZoom: 18,
        fadeDuration: 0,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("load", () => {
        m.addSource("fires", { type: "geojson", data: scenario.fire_areas });
        m.addLayer({ id: "fires-fill", type: "fill", source: "fires", paint: { "fill-color": FIRE, "fill-opacity": 0.32 } });
        // A dark halo under the outline keeps it readable over bright imagery.
        m.addLayer({ id: "fires-halo", type: "line", source: "fires", paint: { "line-color": "#000", "line-width": 4, "line-opacity": 0.35 } });
        m.addLayer({ id: "fires-line", type: "line", source: "fires", paint: { "line-color": FIRE, "line-width": 2.5 } });
        m.addSource("alerts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "alerts-line", type: "line", source: "alerts", paint: { "line-color": ALERT, "line-width": 2, "line-dasharray": [2, 2] } });
        // Start the compact attribution collapsed (the "i" button opens it) so it doesn't cover the legend.
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        setReady(true);
      });
      map.current = m;
    })();
    return () => {
      cancelled = true;
    };
  }, [scenario]);

  useEffect(() => () => map.current?.remove(), []);

  // Live alert shapes (NWS), when any exist.
  useEffect(() => {
    if (!ready || !map.current) return;
    const src = map.current.getSource("alerts") as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: liveAlerts.filter((a) => a.geometry).map((a) => ({ type: "Feature", geometry: a.geometry!, properties: { title: a.title } })),
    });
  }, [ready, liveAlerts]);

  // Pins for the places the assistant returned; zoom to fit them with the fire areas.
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !map.current) return;
      markers.current.forEach((mk) => mk.remove());
      markers.current = resources.map((r) => {
        const el = pinElement(r.kind);
        el.dataset.id = r.id;
        el.setAttribute("aria-label", r.name);
        el.addEventListener("click", (e) => { e.stopPropagation(); onSelectRef.current(r.id); });
        return new ml.Marker({ element: el }).setLngLat([r.lon, r.lat]).addTo(map.current!);
      });
      if (resources.length) {
        const bounds = new ml.LngLatBounds();
        resources.forEach((r) => bounds.extend([r.lon, r.lat]));
        scenario?.fire_areas.features.forEach((f) => {
          const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
          rings.forEach((ring) => ring.forEach(([lon, lat]) => bounds.extend([lon, lat])));
        });
        map.current.fitBounds(bounds, { padding: { top: 80, bottom: 60, left: 40, right: 40 }, maxZoom: 13, duration: 900 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, resources, scenario]);

  // Highlight the selected pin and center on it.
  useEffect(() => {
    markers.current.forEach((mk) => {
      const el = mk.getElement();
      const on = el.dataset.id === selectedId;
      (el.firstElementChild as HTMLElement).style.transform = `scale(${on ? 1.3 : 1})`;
      el.style.zIndex = on ? "2" : "1";
    });
    if (selected && map.current) map.current.easeTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.current.getZoom(), 12), duration: 600 });
  }, [selected, selectedId]);

  const kindsShown = [...new Set(resources.map((r) => r.kind))];

  return (
    <div className="map-shell relative h-full w-full overflow-hidden rounded-lg bg-surface-3 shadow-card">
      {/* h-full, not absolute: maplibre-gl.css forces .maplibregl-map to position: relative */}
      <div ref={container} className="h-full w-full" />

      <a href="tel:911" className="absolute inset-x-3 top-3 z-10 flex h-11 items-center justify-center gap-2 rounded-lg bg-danger-solid font-semibold text-white shadow-pop hover:brightness-110">
        <Phone className="size-4" aria-hidden /> In danger? Call 911.
      </a>

      <div className="absolute left-3 top-16 z-10 flex flex-col items-start gap-1.5">
        <button onClick={() => setShowSources((s) => !s)} aria-expanded={showSources}
          className="inline-flex items-center gap-1.5 rounded-md bg-black/75 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/90">
          <Info className="size-3.5" aria-hidden />
          {replay ? "Replay · Aug 2, 2026" : "Live"} · sources
        </button>
        {showSources && scenario && (
          <div className="max-w-xs rounded-lg bg-surface p-3 text-xs text-muted shadow-pop">
            <p>Fire areas: <a className="text-accent hover:underline" href={scenario.fire_areas.source.url} target="_blank" rel="noopener noreferrer">{scenario.fire_areas.source.name}</a>, retrieved {new Date(scenario.fire_areas.source.retrieved_at).toLocaleDateString()}.</p>
            <p className="mt-1.5">Places are hand-checked demo data; each one links to its source. Call 2-1-1 to confirm before you go.</p>
            <p className="mt-1.5">Imagery © Esri, Maxar, Earthstar Geographics.</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 right-3 z-10 flex flex-col gap-1.5 rounded-lg bg-surface/95 p-2.5 text-xs shadow-card">
        <span className="flex items-center gap-2"><span className="size-3 rounded-sm border-2" style={{ borderColor: FIRE, background: `${FIRE}55` }} /> Fire area</span>
        {kindsShown.map((k) => (
          <span key={k} className="flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ background: KIND_STYLE[k].color }} /> {KIND_STYLE[k].label}
          </span>
        ))}
      </div>

      {selected && (
        <div className="absolute bottom-8 left-3 z-10 w-[min(20rem,calc(100%-1.5rem))] rounded-lg bg-surface p-3.5 shadow-pop">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 size-2.5 shrink-0 rounded-full" style={{ background: KIND_STYLE[selected.kind].color }} />
            <p className="flex-1 text-sm font-semibold leading-snug">{selected.name}</p>
            <button onClick={() => onSelect(null)} aria-label="Close" className="text-muted hover:text-ink"><X className="size-4" /></button>
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted"><MapPin className="mt-px size-3.5 shrink-0" aria-hidden />{selected.address}</p>
          {selected.hours && <p className="mt-1 flex items-start gap-1.5 text-xs text-muted"><Clock className="mt-px size-3.5 shrink-0" aria-hidden />{selected.hours}</p>}
          {selected.notes && <p className="mt-1.5 text-xs">{selected.notes}</p>}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lon}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-ink">
              <Navigation className="size-3.5" aria-hidden /> Directions
            </a>
            {selected.phone && (
              <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-3 px-3 text-[13px] font-semibold">
                <Phone className="size-3.5" aria-hidden /> {selected.phone}
              </a>
            )}
          </div>
          <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-subtle hover:text-accent">
            Source: {selected.source_name} · checked {selected.checked_at} <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
