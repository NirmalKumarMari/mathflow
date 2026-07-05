import { getLanguageForCountry } from "./countries";

/**
 * Returns a language instruction string to append to LLM prompts.
 * Empty string for English (default), so existing prompts are unaffected.
 */
export function getLanguageInstruction(language) {
  if (!language || language === "English") return "";
  return `\n\nIMPORTANT: Write ALL content (questions, explanations, hints, encouragement, study guides, analysis) entirely in ${language}. The student's native language is ${language}.`;
}

/**
 * Resolves the tutoring language for a given subject.
 * Subject language takes priority (e.g. from textbook), then falls back to profile.
 */
export function getSubjectLanguage(subject, profile) {
  return subject?.language || profile?.language || "English";
}

/**
 * Derives the language from a country name.
 */
export function languageFromCountry(countryName) {
  return getLanguageForCountry(countryName);
}