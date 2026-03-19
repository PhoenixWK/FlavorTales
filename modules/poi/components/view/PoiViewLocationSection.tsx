interface Props {
  lat: number;
  lng: number;
  name: string;
  radius: number;
  websiteUrl?: string | null;
}

function IconMapPin() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 text-orange-500 shrink-0"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function PoiViewLocationSection({ lat, lng, name, radius, websiteUrl }: Props) {
  const delta = 0.003;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
  const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=18`;

  return (
    <div className="space-y-5">
      {/* Stall Address / Zone */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Stall Address / Zone</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <IconMapPin />
          <span className="text-sm text-gray-800">{name}</span>
          <span className="ml-auto text-xs text-gray-400">{radius} m radius</span>
        </div>
      </div>

      {/* Embedded map */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Map Location</p>
        <div className="relative w-full h-44 sm:h-56 lg:h-64 rounded-xl overflow-hidden border border-gray-200">
          <iframe
            title={`Map for ${name}`}
            src={embedSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow flex items-center gap-1 hover:bg-gray-50 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-3 h-3"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in Maps
          </a>
        </div>
      </div>

      {/* Coordinates */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Coordinates</p>
        <p className="text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>

      {/* Website link */}
      {websiteUrl && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Website Link</p>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange-500 hover:underline bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 block truncate"
          >
            {websiteUrl}
          </a>
        </div>
      )}
    </div>
  );
}
