import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export default function ViewSection({ title, children }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-linear-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <h3 className="text-sm font-semibold text-orange-700">{title}</h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
