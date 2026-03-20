export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
  phoneMask?: string;
}

export const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dial: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanha', dial: '+34', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'CO', name: 'Colômbia', dial: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguai', dial: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', dial: '+595', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolívia', dial: '+591', flag: '🇧🇴' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'EC', name: 'Equador', dial: '+593', flag: '🇪🇨' },
  { code: 'GB', name: 'Reino Unido', dial: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'França', dial: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemanha', dial: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Itália', dial: '+39', flag: '🇮🇹' },
  { code: 'JP', name: 'Japão', dial: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'Índia', dial: '+91', flag: '🇮🇳' },
  { code: 'AU', name: 'Austrália', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canadá', dial: '+1', flag: '🇨🇦' },
  { code: 'ZA', name: 'África do Sul', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigéria', dial: '+234', flag: '🇳🇬' },
  { code: 'AE', name: 'Emirados Árabes', dial: '+971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapura', dial: '+65', flag: '🇸🇬' },
  { code: 'KR', name: 'Coreia do Sul', dial: '+82', flag: '🇰🇷' },
  { code: 'RU', name: 'Rússia', dial: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turquia', dial: '+90', flag: '🇹🇷' },
];

export function validatePhone(phone: string, countryCode: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (countryCode === 'BR') return digits.length === 10 || digits.length === 11;
  return digits.length >= 7 && digits.length <= 15;
}
