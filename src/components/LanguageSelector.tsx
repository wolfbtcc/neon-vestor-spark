import { useLanguage, Language } from '@/contexts/LanguageContext';

const flags: { code: Language; flag: string; label: string }[] = [
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
];

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      {flags.map((f) => (
        <button
          key={f.code}
          onClick={() => setLang(f.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            lang === f.code
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <span className="text-sm">{f.flag}</span>
          <span className="hidden sm:inline">{f.label}</span>
        </button>
      ))}
    </div>
  );
}
