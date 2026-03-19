"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  name: string;
  description: string;
  errors: { name?: string; description?: string };
  onChange: (field: "name" | "description", value: string) => void;
  maxDescChars?: number;
  showRemaining?: boolean;
  /** Hide the name field — use when name is rendered in a separate section. Defaults to true. */
  showName?: boolean;
  onBlurName?: () => void;
  onBlurDescription?: () => void;
}

const MAX_DESC = 1000;
const MIN_DESC = 50;

// ── Tiny rich-text toolbar ───────────────────────────────────────────────────
function ToolbarButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      className="px-2 py-1 text-xs font-medium rounded hover:bg-gray-200 transition text-gray-700 border border-gray-200"
    >
      {label}
    </button>
  );
}

export default function ShopBasicInfoSection({
  name,
  description,
  errors,
  onChange,
  maxDescChars,
  showRemaining,
  showName = true,
  onBlurName,
  onBlurDescription,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [plainLen, setPlainLen] = useState(0);
  const maxChars = maxDescChars ?? MAX_DESC;

  // Sync incoming description → editor (only on first mount)
  useEffect(() => {
    if (editorRef.current && description && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = description;
      updateLen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLen() {
    const text = editorRef.current?.innerText ?? "";
    setPlainLen(text.length);
  }

  function handleInput() {
    updateLen();
    onChange("description", editorRef.current?.innerHTML ?? "");
  }

  function execCmd(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleInput();
  }

  const lenColor =
    plainLen < MIN_DESC
      ? "text-red-500"
      : plainLen > maxChars
      ? "text-red-500"
      : "text-gray-400";

  return (
    <section className="space-y-5">
      {/* ── Shop Name ──────────────────────────────────────────────────── */}
      {showName && <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tên gian hàng <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          maxLength={100}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={onBlurName}
          placeholder="VD: Bún bò Huế Mẹ Loan"
          className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white text-gray-900
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400
            focus:border-transparent ${errors.name ? "border-red-400" : "border-gray-200"}`}
        />
        <div className="flex justify-between mt-1">
          {errors.name ? (
            <p className="text-xs text-red-500">{errors.name}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{name.length}/100</span>
        </div>
      </div>}

      {/* ── Description (Rich Text) ─────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả giới thiệu <span className="text-red-500">*</span>
        </label>

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={onBlurDescription}
          data-placeholder="Mô tả gian hàng của bạn (tối thiểu 50 ký tự)…"
          className={`min-h-[140px] max-h-[280px] overflow-y-auto w-full px-3 py-2.5 rounded-xl border
            text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400
            focus:border-transparent empty:before:content-[attr(data-placeholder)]
            empty:before:text-gray-400 empty:before:pointer-events-none
            [&_ul]:list-disc [&_ul]:pl-5
            ${errors.description ? "border-red-400" : "border-gray-200"}`}
        />

        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-xs text-red-500">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className={`text-xs ${lenColor}`}>
            {showRemaining
              ? `${Math.max(0, maxChars - plainLen)} ký tự còn lại`
              : `${plainLen}/${maxChars}`}
          </span>
        </div>
      </div>
    </section>
  );
}
