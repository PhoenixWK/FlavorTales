"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useReducer,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "loading" | "success" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Auto-dismiss after this many milliseconds. Omit to keep until manually dismissed. */
  duration?: number;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD"; toast: Toast }
  | { type: "UPDATE"; id: string; updates: Partial<Omit<Toast, "id">> }
  | { type: "REMOVE"; id: string };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "UPDATE":
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.updates } : t
      );
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[];
  /** Adds a toast and returns its generated ID. */
  addToast: (type: ToastType, message: string, duration?: number) => string;
  /** Updates an existing toast by ID (e.g. loading → success). */
  updateToast: (id: string, updates: Partial<Omit<Toast, "id">>) => void;
  /** Removes a toast by ID. */
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      dispatch({ type: "ADD", toast: { id, type, message, duration } });
      return id;
    },
    []
  );

  const updateToast = useCallback(
    (id: string, updates: Partial<Omit<Toast, "id">>) => {
      dispatch({ type: "UPDATE", id, updates });
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, updateToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
