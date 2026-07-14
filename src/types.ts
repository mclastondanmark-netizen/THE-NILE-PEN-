/**
 * Types and interfaces for The Nile Pen
 */

export interface Subscriber {
  uid?: string;
  email: string;
  countries: string[];
  categories: string[];
  frequency: "daily" | "weekly" | "breaking";
  sendTime: string; // e.g., "08:00"
  timezone: string; // e.g., "UTC", "America/New_York"
  createdAt: number;
  referredBy?: string;
  referralCount: number;
  language: "en" | "ar" | "fr" | "es";
  isSubscribed: boolean;
}

export interface MailingListSignup {
  id?: string;
  email: string;
  createdAt: number;
}

export interface NewsLead {
  id: string; // unique hash or sanitized id
  title: string;
  snippet: string;
  source: string;
  link: string;
  country: string; // e.g. "EG", "US"
  category: "politics" | "business" | "technology" | "sports" | "entertainment" | "health";
  publishedAt: string; // date string
  createdAt: number; // timestamp
  image?: string; // real-time parsed image url
}

export interface CuratedStory {
  title: string;
  snippet: string;
  source: string;
  link: string;
  category: "politics" | "business" | "technology" | "sports" | "entertainment" | "health";
  editorialComment: string; // curated commentary written by editor
  image?: string; // real-time parsed image url
}

export interface NewsletterIssue {
  id: string;
  title: string;
  editionDate: string; // e.g., "July 5, 2026"
  country: string; // e.g., "EG", "US"
  status: "draft" | "published";
  createdAt: number;
  publishedAt?: number;
  stories: CuratedStory[];
  editorEmail: string;
}

export interface AuditLog {
  id: string;
  editorEmail: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface ConfiguredFeed {
  id: string;
  name: string;
  url: string;
  country: string;
  category: "politics" | "business" | "technology" | "sports" | "entertainment" | "health";
  createdAt: number;
}

export const COUNTRIES = [
  // Global & Major
  { code: "GL", name: "Global", flag: "🌐" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },

  // African Countries (A-Z)
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "ST", name: "São Tomé and Príncipe", flag: "🇸🇹" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" }
];

export const CATEGORIES = [
  { id: "politics", name: "Politics", color: "bg-red-500", border: "border-red-500", text: "text-red-600" },
  { id: "business", name: "Business", color: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-600" },
  { id: "technology", name: "Science & Tech", color: "bg-blue-500", border: "border-blue-500", text: "text-blue-600" },
  { id: "sports", name: "Sports", color: "bg-amber-500", border: "border-amber-500", text: "text-amber-600" },
  { id: "entertainment", name: "Culture", color: "bg-purple-500", border: "border-purple-500", text: "text-purple-600" },
  { id: "health", name: "Health", color: "bg-teal-500", border: "border-teal-500", text: "text-teal-600" }
];
