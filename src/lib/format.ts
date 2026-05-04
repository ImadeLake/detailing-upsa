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

const COUNTRY_CODES: Record<string, string> = {
  "Sénégal": "sn",
  "Senegal": "sn",
  "Côte d'Ivoire": "ci",
  "Cote d'Ivoire": "ci",
  "Côte d’Ivoire": "ci",
  "Cameroun": "cm",
  "Cameroon": "cm",
  "Mali": "ml",
  "Burkina Faso": "bf",
  "Madagascar": "mg",
  "Gabon": "ga",
  "Bénin": "bj",
  "Benin": "bj",
  "Togo": "tg",
  "Congo": "cg",
  "République du Congo": "cg",
  "République Démocratique du Congo": "cd",
  "RDC": "cd",
  "Niger": "ne",
  "Tchad": "td",
  "Chad": "td",
  "Guinée": "gn",
  "Guinea": "gn",
  "Mauritanie": "mr",
  "Maroc": "ma",
  "Algérie": "dz",
  "Tunisie": "tn",
  "France": "fr",
  "Ile Maurice": "mu",
  "Île Maurice": "mu",
  "Maurice": "mu",
};

export function countryCode(name: string): string | null {
  return COUNTRY_CODES[name] ?? null;
}
