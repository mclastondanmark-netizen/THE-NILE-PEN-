import React, { useState, useRef, useEffect } from "react";
import { COUNTRIES, CATEGORIES } from "../types";
import { Globe, Moon, Sun, User, Newspaper, Sparkles, LogOut, Check, Search, X } from "lucide-react";

interface MastheadProps {
  activeCountry: string;
  setActiveCountry: (code: string) => void;
  user: any;
  userRole: string;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  activeView: "reader" | "editor" | "settings";
  setActiveView: (view: "reader" | "editor" | "settings") => void;
  language: string;
  setLanguage: (lang: any) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenChat: () => void;
}

export default function Masthead({
  activeCountry,
  setActiveCountry,
  user,
  userRole,
  isDarkMode,
  setIsDarkMode,
  activeView,
  setActiveView,
  language,
  setLanguage,
  onOpenAuth,
  onLogout,
  onOpenChat
}: MastheadProps) {
  const [countrySearch, setCountrySearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentCountry = COUNTRIES.find(c => c.code === activeCountry) || COUNTRIES[0];
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const filteredCountries = countrySearch.trim() === "" 
    ? COUNTRIES
    : COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      );

  const translations = {
    en: {
      subTitle: "A Distinguished Human-Curated Journal of Global Affairs",
      edition: "Edition",
      vol: "Vol. V • No. 182",
      reader: "The Gazette",
      editor: "Editorial Office",
      login: "Sign In",
      logout: "Exit Office",
      chat: "Nile Desk",
      lang: "Language",
      freePress: "100% Verified Journalism • No AI-written news content"
    },
    ar: {
      subTitle: "صحيفة متميزة يحررها صحفيون مخلصون للشؤون العالمية",
      edition: "طبعة",
      vol: "المجلد الخامس • العدد ١٨٢",
      reader: "الجريدة",
      editor: "مكتب التحرير",
      login: "تسجيل الدخول",
      logout: "الخروج",
      chat: "مكتب النيل",
      lang: "اللغة",
      freePress: "صحافة موثقة بنسبة ١٠٠٪ • خالية من المقالات المكتوبة بالذكاء الاصطناعي"
    },
    fr: {
      subTitle: "Un Journal Distingué d'Affaires Globales, Rédigé par des Humains",
      edition: "Édition",
      vol: "Vol. V • No. 182",
      reader: "La Gazette",
      editor: "Bureau Rédactionnel",
      login: "Se Connecter",
      logout: "Déconnexion",
      chat: "Bureau Nile",
      lang: "Langue",
      freePress: "Journalisme 100% Vérifié • Aucun article écrit par IA"
    },
    es: {
      subTitle: "Un Periódico Distinguido de Asuntos Globales, Redactado por Humanos",
      edition: "Edición",
      vol: "Vol. V • No. 182",
      reader: "La Gaceta",
      editor: "Oficina Editorial",
      login: "Iniciar Sesión",
      logout: "Cerrar Sesión",
      chat: "Escritorio Nilo",
      lang: "Idioma",
      freePress: "Periodismo 100% Verificado • Sin artículos redactados por IA"
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <header className="border-b-4 border-double border-brand-primary pb-4 mb-6">
      {/* Utility top bar */}
      <div className="flex justify-between items-center text-xs font-mono border-b border-brand-border pb-2 mb-3">
        <div className="hidden sm:flex items-center gap-2 text-brand-secondary">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{t.freePress}</span>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {/* Language selection dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-brand-secondary hover:text-brand-primary transition">
              <Globe className="w-3.5 h-3.5" />
              <span>{language.toUpperCase()}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-brand-surface border border-brand-border rounded shadow-lg hidden group-hover:block z-50 py-1 min-w-[100px]">
              {(["en", "ar", "fr", "es"] as const).map(lng => (
                <button
                  key={lng}
                  onClick={() => setLanguage(lng)}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-brand-bg text-brand-primary flex items-center justify-between"
                >
                  <span>{lng === "en" ? "English" : lng === "ar" ? "العربية" : lng === "fr" ? "Français" : "Español"}</span>
                  {language === lng && <Check className="w-3 h-3 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-brand-secondary hover:text-brand-primary transition"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* AI Desk Assistant */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1 px-2 py-0.5 bg-brand-surface border border-brand-border text-brand-accent hover:opacity-90 rounded transition font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
            <span>{t.chat}</span>
          </button>

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveView("settings")}
                className={`flex items-center gap-1.5 px-2 py-0.5 hover:bg-brand-surface rounded transition text-brand-primary ${activeView === "settings" ? "bg-brand-surface font-bold" : ""}`}
              >
                <User className="w-3.5 h-3.5 text-brand-secondary" />
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{user.displayName || user.email}</span>
                {userRole === "editor" || userRole === "admin" ? (
                  <span className="text-[10px] bg-brand-urgent/10 text-brand-urgent px-1 rounded uppercase font-semibold">
                    Editor
                  </span>
                ) : null}
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-brand-urgent hover:underline transition ml-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 py-0.5 border border-brand-primary hover:bg-brand-primary hover:text-brand-surface rounded transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Newspaper Header Branding */}
      <div className="text-center py-4 my-2">
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-brand-primary select-none leading-none mb-2">
          THE NILE PEN
        </h1>
        <p className="font-serif italic text-sm sm:text-base text-brand-secondary max-w-2xl mx-auto px-4">
          {t.subTitle}
        </p>
      </div>

      {/* Middle info bar */}
      <div className="border-t border-b border-brand-primary py-1.5 flex flex-col sm:flex-row justify-between items-center text-xs font-serif font-bold uppercase tracking-widest text-brand-primary gap-2 mb-4">
        <div>{t.vol}</div>
        <div className="text-center px-4 py-1 sm:py-0 bg-brand-primary text-brand-bg rounded font-sans tracking-normal font-medium flex items-center gap-1.5">
          <span>{currentCountry.flag}</span>
          <span>{currentCountry.name} {t.edition}</span>
        </div>
        <div>{dateStr}</div>
      </div>

      {/* Navigation and Country selection bar */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mt-2" ref={dropdownRef}>
        {/* Country Search Box */}
        <div className="w-full lg:max-w-xl flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Active indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary text-brand-surface rounded text-xs font-mono font-bold uppercase tracking-wider shrink-0 select-none border border-brand-primary">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Edition:</span>
            <span className="text-sm">{currentCountry.flag}</span>
            <span className="max-w-[120px] truncate">{currentCountry.name}</span>
          </div>

          {/* Typing Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-brand-secondary" />
            </div>
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => {
                setCountrySearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Type to search country (e.g. Kenya, Sudan, Egypt...)"
              className="w-full text-xs bg-brand-surface border border-brand-border rounded pl-8 pr-8 py-2 text-brand-primary placeholder:text-brand-secondary/50 focus:outline-hidden focus:border-brand-accent transition-colors font-mono"
            />
            {countrySearch && (
              <button 
                onClick={() => { setCountrySearch(""); setIsDropdownOpen(false); }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-secondary hover:text-brand-primary cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Dropdown Suggestions list */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-brand-surface border border-brand-border rounded shadow-lg z-50 py-1 scrollbar-thin">
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-brand-secondary font-mono">
                    No matching countries found
                  </div>
                ) : (
                  filteredCountries.map(country => (
                    <button
                      key={country.code}
                      onClick={() => {
                        setActiveCountry(country.code);
                        setCountrySearch("");
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-brand-bg text-brand-primary flex items-center justify-between font-mono cursor-pointer ${
                        activeCountry === country.code ? "bg-brand-bg text-brand-accent font-bold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{country.flag}</span>
                        <span>{country.name}</span>
                      </div>
                      {activeCountry === country.code && (
                        <span className="text-[9px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded uppercase font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Switchers (Gazette / Editorial Office) */}
        {(userRole === "editor" || userRole === "admin") && (
          <div className="flex bg-brand-surface p-0.5 rounded border border-brand-border shrink-0 w-full md:w-auto">
            <button
              onClick={() => setActiveView("reader")}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-mono font-medium rounded transition flex items-center justify-center gap-2 ${
                activeView === "reader"
                  ? "bg-brand-bg text-brand-primary shadow-xs font-bold"
                  : "text-brand-secondary hover:text-brand-primary"
              }`}
            >
              <span>{t.reader}</span>
            </button>
            <button
              onClick={() => setActiveView("editor")}
              className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-mono font-medium rounded transition flex items-center justify-center gap-2 ${
                activeView === "editor"
                  ? "bg-brand-bg text-brand-primary shadow-xs font-bold"
                  : "text-brand-secondary hover:text-brand-primary"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
              <span>{t.editor}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
