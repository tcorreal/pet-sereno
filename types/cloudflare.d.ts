interface Fetcher { fetch(input: Request | string, init?: RequestInit): Promise<Response>; }
declare module "cloudflare:workers" {
  export const env: {
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_APP_TOKEN?: string;
    EMAIL_WEBHOOK_URL?: string;
    EMAIL_WEBHOOK_SECRET?: string;
    EMAIL_FROM_NAME?: string;
    [key: string]: unknown;
  };
}
