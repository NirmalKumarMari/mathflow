import { useEffect } from "react";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { translations, RTL_LANGUAGES } from "@/lib/translations";
import { pageTranslations } from "@/lib/pageTranslations";

/**
 * Returns the current UI language, a translation function t(key),
 * and isRTL flag. Also sets document dir/lang as a side effect.
 */
export function useI18n() {
  const { profile } = useStudentProfile();
  const lang = profile?.language || "English";
  const isRTL = RTL_LANGUAGES.includes(lang);

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = (key) => {
    return pageTranslations[lang]?.[key] || translations[lang]?.[key] || translations.English[key] || key;
  };

  return { t, lang, isRTL };
}