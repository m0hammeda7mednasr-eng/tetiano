import dotenv from 'dotenv';
dotenv.config();

export interface ShopifyConfig {
  domain: string;
  accessToken: string;
  locationId: string;
}

export interface ShopifyConfigSource {
  domain?: string | null;
  accessToken?: string | null;
  legacyAccessToken?: string | null;
  locationId?: string | null;
}

export const shopifyConfigs: Record<string, ShopifyConfig> = {
  tetiano: {
    domain: process.env.SHOPIFY_TETIANO_DOMAIN || '',
    accessToken: process.env.SHOPIFY_TETIANO_ACCESS_TOKEN || '',
    locationId: process.env.SHOPIFY_TETIANO_LOCATION_ID || '',
  },
  '98': {
    domain: process.env.SHOPIFY_98_DOMAIN || '',
    accessToken: process.env.SHOPIFY_98_ACCESS_TOKEN || '',
    locationId: process.env.SHOPIFY_98_LOCATION_ID || '',
  },
};

export const getShopifyConfig = (
  brandName: string,
  source?: ShopifyConfigSource,
): ShopifyConfig => {
  const envConfig = shopifyConfigs[brandName.toLowerCase()];

  const domain = source?.domain || envConfig?.domain || "";
  const accessToken =
    source?.accessToken || source?.legacyAccessToken || envConfig?.accessToken || "";
  const locationId = source?.locationId || envConfig?.locationId || "";

  if (!domain || !accessToken) {
    throw new Error(`Invalid Shopify configuration for brand: ${brandName}`);
  }

  return {
    domain,
    accessToken,
    locationId,
  };
};

export const SHOPIFY_API_VERSION = '2024-01';
export const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
