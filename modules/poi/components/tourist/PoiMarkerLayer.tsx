"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";
import { getPoiIcon } from "@/modules/poi/utils/poiIconFactory";

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_ZOOM_THRESHOLD   = 17;
const CLUSTER_ZOOM_THRESHOLD = 17;

// ── Tooltip factory ───────────────────────────────────────────────────────────

function makeTooltip(name: string): L.Tooltip {
  return L.tooltip({
    permanent: true,
    direction: "top",
    offset: [0, -42],
    className: "poi-label-tooltip",
  }).setContent(
    `<span style="font-size:11px;font-weight:600;white-space:nowrap;color:#1f2937;background:#fff;padding:1px 5px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.2)">${name}</span>`
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  pois: TouristPoi[];
  selectedPoiId: number | null;
  visitedPoiIds: Set<number>;
  onSelect: (poiId: number) => void;
  /** Desktop: called on mouseover with the map-container pixel position. */
  onHover: (poi: TouristPoi, point: { x: number; y: number }) => void;
  onHoverEnd: () => void;
}

/**
 * FR-LM-003: Renders POI markers with clustering (zoom < 17) and category icons.
 * Must be mounted inside a <MapContainer>.
 *
 * Desktop: mouseover → preview card; click → detail panel.
 * Mobile:  first tap → preview card; second tap on same marker → detail panel.
 */
export default function PoiMarkerLayer({
  pois,
  selectedPoiId,
  visitedPoiIds,
  onSelect,
  onHover,
  onHoverEnd,
}: Props) {
  const map = useMap();

  const clusterGroupRef     = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef          = useRef<Map<number, L.Marker>>(new Map());
  const tooltipsRef         = useRef<Map<number, L.Tooltip>>(new Map());
  const lastTouchedPoiIdRef = useRef<number | null>(null);

  // ── Create cluster group once ──────────────────────────────────────────────
  useEffect(() => {
    const group = L.markerClusterGroup({
      disableClusteringAtZoom: CLUSTER_ZOOM_THRESHOLD,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            width:40px;height:40px;border-radius:50%;
            background:#F97316;color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700;
            border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)
          ">${count}</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    clusterGroupRef.current = group;
    map.addLayer(group);

    return () => {
      map.removeLayer(group);
      clusterGroupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Sync markers with POI list ─────────────────────────────────────────────
  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group) return;

    const existing = markersRef.current;
    const newIds = new Set(pois.map((p) => p.poiId));

    // Remove markers no longer in list
    for (const [id, marker] of existing) {
      if (!newIds.has(id)) {
        group.removeLayer(marker);
        tooltipsRef.current.get(id)?.remove();
        existing.delete(id);
        tooltipsRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const poi of pois) {
      const isSelected = poi.poiId === selectedPoiId;
      const isVisited  = visitedPoiIds.has(poi.poiId);
      const state      = isSelected ? "selected" : isVisited ? "visited" : "default";
      const icon       = getPoiIcon(poi, state);

      if (existing.has(poi.poiId)) {
        existing.get(poi.poiId)!.setIcon(icon);
      } else {
        const marker = L.marker([poi.latitude, poi.longitude], { icon });

        // Desktop hover
        marker.on("mouseover", (e: L.LeafletMouseEvent) => onHover(poi, e.containerPoint));
        marker.on("mouseout", () => onHoverEnd());

        // Click / tap
        marker.on("click", (e: L.LeafletMouseEvent) => {
          const isTouchDevice = !matchMedia("(hover: hover)").matches;
          if (isTouchDevice) {
            if (lastTouchedPoiIdRef.current === poi.poiId) {
              onSelect(poi.poiId);
              lastTouchedPoiIdRef.current = null;
            } else {
              lastTouchedPoiIdRef.current = poi.poiId;
              onHover(poi, e.containerPoint);
            }
          } else {
            onSelect(poi.poiId);
          }
        });

        group.addLayer(marker);
        existing.set(poi.poiId, marker);

        const tooltip = makeTooltip(poi.linkedShopName ?? poi.name);
        marker.bindTooltip(tooltip);
        tooltipsRef.current.set(poi.poiId, tooltip);
      }
    }
  // Full sync on any relevant change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pois, selectedPoiId, visitedPoiIds]);

  // ── Show/hide labels based on zoom ────────────────────────────────────────
  useEffect(() => {
    function handleZoom() {
      const zoom = map.getZoom();
      const show = zoom > LABEL_ZOOM_THRESHOLD;
      for (const marker of markersRef.current.values()) {
        const tooltip = (marker as unknown as { _tooltip?: L.Tooltip })._tooltip;
        if (!tooltip) continue;
        if (show) {
          tooltip.addTo(map);
          marker.bindTooltip(tooltip);
        } else {
          marker.unbindTooltip();
        }
      }
    }

    map.on("zoomend", handleZoom);
    handleZoom(); // initial check

    return () => { map.off("zoomend", handleZoom); };
  }, [map]);

  return null;
}
