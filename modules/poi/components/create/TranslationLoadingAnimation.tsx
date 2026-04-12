"use client";

import { motion } from "framer-motion";
import { LANGUAGE_META } from "./TranslationLanguageCard";

const LANGUAGES = ["english", "korean", "chinese", "russian", "japanese"];

const dotVariants = {
  animate: (i: number) => ({
    opacity: [0.3, 1, 0.3],
    transition: { duration: 1.2, repeat: Infinity, delay: i * 0.2 },
  }),
};

export default function TranslationLoadingAnimation() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* ── Animated speech-bubble icon ── */}
      <div className="relative w-28 h-20 select-none">
        {/* Left bubble (文) */}
        <motion.div
          animate={{ scale: [1, 1.07, 1], y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 top-0 w-16 h-14 bg-blue-500 rounded-2xl rounded-bl-none
                     flex items-center justify-center shadow-md"
        >
          <span className="text-white text-2xl font-bold leading-none">文</span>
        </motion.div>

        {/* Right bubble (A) */}
        <motion.div
          animate={{ scale: [1, 1.07, 1], y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
          className="absolute right-0 bottom-0 w-16 h-14 bg-gray-700 rounded-2xl rounded-br-none
                     flex items-center justify-center shadow-md"
        >
          <span className="text-white text-2xl font-bold leading-none">A</span>
        </motion.div>

        {/* Animated arrow between the two bubbles */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1], x: [0, 4, -4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-orange-400 text-lg font-bold drop-shadow">⇄</span>
        </motion.div>
      </div>

      {/* ── Subtitle with animated dots ── */}
      <div className="flex items-center gap-1 text-sm text-gray-500 font-medium">
        <span>Đang dịch nội dung</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            custom={i}
            variants={dotVariants}
            animate="animate"
            className="text-orange-400 font-bold"
          >
            .
          </motion.span>
        ))}
      </div>

      {/* ── Language rows sliding in ── */}
      <div className="w-full space-y-2">
        {LANGUAGES.map((lang, i) => {
          const meta = LANGUAGE_META[lang];
          return (
            <motion.div
              key={lang}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.35 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50"
            >
              <span className="text-lg">{meta.flag}</span>
              <div className="flex flex-col leading-tight flex-1">
                <span className="text-sm font-medium text-gray-700">{meta.country}</span>
                <span className="text-xs text-gray-400">{meta.label}</span>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full shrink-0"
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
