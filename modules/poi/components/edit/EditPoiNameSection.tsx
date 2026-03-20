interface Props {
  name: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function EditPoiNameSection({ name, error, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Tên POI <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        name="name"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="VD: Bún chả Hương Liên"
        maxLength={100}
        className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
