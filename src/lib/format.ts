export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}h${mm.toString().padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return `${d}j ${hh}h`;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "Sénégal": "🇸🇳",
  "Senegal": "🇸🇳",
  "Côte d'Ivoire": "🇨🇮",
  "Cote d'Ivoire": "🇨🇮",
  "Côte d’Ivoire": "🇨🇮",
  "Cameroun": "🇨🇲",
  "Cameroon": "🇨🇲",
  "Mali": "🇲🇱",
  "Burkina Faso": "🇧🇫",
  "Madagascar": "🇲🇬",
  "Gabon": "🇬🇦",
  "Bénin": "🇧🇯",
  "Benin": "🇧🇯",
  "Togo": "🇹🇬",
  "Congo": "🇨🇬",
  "République du Congo": "🇨🇬",
  "République Démocratique du Congo": "🇨🇩",
  "RDC": "🇨🇩",
  "Niger": "🇳🇪",
  "Tchad": "🇹🇩",
  "Chad": "🇹🇩",
  "Guinée": "🇬🇳",
  "Guinea": "🇬🇳",
  "Mauritanie": "🇲🇷",
  "Maroc": "🇲🇦",
  "Algérie": "🇩🇿",
  "Tunisie": "🇹🇳",
  "France": "🇫🇷",
  "Ile Maurice": "🇲🇺",
  "Île Maurice": "🇲🇺",
  "Maurice": "🇲🇺",
};

export function countryFlag(name: string): string {
  return COUNTRY_FLAGS[name] ?? "🌍";
}
