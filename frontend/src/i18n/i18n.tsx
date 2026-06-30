import * as SecureStore from "expo-secure-store";
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { LanguageCode, TranslationParams, languages, translations } from "@/i18n/translations";
import { getWebStorage } from "@/lib/web-storage";

type I18nContextValue = {
  language: LanguageCode;
  languages: typeof languages;
  ready: boolean;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: string, params?: TranslationParams) => string;
};

const LANGUAGE_KEY = "bergmann_language";
const DEFAULT_LANGUAGE: LanguageCode = "pt-BR";
const I18nContext = createContext<I18nContextValue | null>(null);
const languageStorage = getWebStorage("local");

async function getStoredLanguage(): Promise<LanguageCode | null> {
  const value = typeof window !== "undefined" ? languageStorage.getItem(LANGUAGE_KEY) : await SecureStore.getItemAsync(LANGUAGE_KEY);
  return value === "pt-BR" || value === "en" || value === "es" ? value : null;
}

async function setStoredLanguage(language: LanguageCode): Promise<void> {
  if (typeof window !== "undefined") {
    languageStorage.setItem(LANGUAGE_KEY, language);
    return;
  }
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}

function formatTranslation(value: string, params?: TranslationParams) {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/gu, (_, key: string) => String(params[key] ?? ""));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrateLanguage() {
      const stored = await getStoredLanguage();
      if (mounted) {
        setLanguageState(stored ?? DEFAULT_LANGUAGE);
        setReady(true);
      }
    }

    void hydrateLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    await setStoredLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const value = translations[language][key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
      return formatTranslation(value, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      languages,
      ready,
      setLanguage,
      t
    }),
    [language, ready, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
