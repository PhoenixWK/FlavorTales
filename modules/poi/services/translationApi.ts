const POI_PROXY_BASE = "/api/poi";
const SHOP_PROXY_BASE = "/api/shop";

export type TranslationLanguage = "english" | "korean" | "chinese" | "russian";

export interface PoiLanguageResult {
  language: TranslationLanguage;
  languageCode: string;
  success: boolean;
  errorMessage?: string;
  translatedName?: string;
  translatedAddress?: string;
}

export interface ShopLanguageResult {
  language: TranslationLanguage;
  languageCode: string;
  success: boolean;
  errorMessage?: string;
  translatedName?: string;
  translatedDescription?: string;
  translatedCuisineStyle?: string;
  translatedFeaturedDish?: string;
}

export interface PoiTranslationDetail {
  poiId: number;
  language: string;
  languageCode: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address?: string | null;
  status: string;
  likesCount: number;
}

export interface ShopTranslationDetail {
  shopId: number;
  language: string;
  languageCode: string;
  vendorId: number;
  poiId?: number | null;
  avatarFileId?: number | null;
  name: string;
  description?: string | null;
  cuisineStyle?: string | null;
  featuredDish?: string | null;
  status: string;
}

async function post<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "Translation request failed");
  return json.data as T;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "Failed to fetch translation");
  return json.data as T;
}

export async function translatePoi(poiId: number): Promise<PoiLanguageResult[]> {
  return post(`${POI_PROXY_BASE}/${poiId}/translate`);
}

export async function translateShop(shopId: number): Promise<ShopLanguageResult[]> {
  return post(`${SHOP_PROXY_BASE}/${shopId}/translate`);
}

export async function getPoiTranslation(
  poiId: number,
  lang: string
): Promise<PoiTranslationDetail> {
  return get(`${POI_PROXY_BASE}/${poiId}/translation/${lang}`);
}

export async function getShopTranslation(
  shopId: number,
  lang: string
): Promise<ShopTranslationDetail> {
  return get(`${SHOP_PROXY_BASE}/${shopId}/translation/${lang}`);
}
