import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("uses the private Supabase RPC gateway instead of D1", async () => {
  const [gateway, data, hosting, workerTypes] = await Promise.all([
    read("lib/supabase.ts"),
    read("lib/data.ts"),
    read(".openai/hosting.json"),
    read("types/cloudflare.d.ts"),
  ]);
  assert.match(gateway, /SUPABASE_APP_TOKEN/);
  assert.match(gateway, /p_app_token/);
  assert.match(data, /api_register_customer_pet/);
  assert.match(data, /api_confirm_reservation/);
  assert.equal(JSON.parse(hosting).d1, null);
  assert.doesNotMatch(workerTypes, /D1Database/);
});

test("keeps secrets server-side and produces the deployment worker", async () => {
  const [example, worker] = await Promise.all([
    read(".env.example"),
    stat(new URL("../dist/server/index.js", import.meta.url)),
  ]);
  assert.match(example, /^SUPABASE_APP_TOKEN=$/m);
  assert.equal(worker.isFile(), true);
});

test("manages service lifecycle and email without Google Sheets", async () => {
  const [data, email, services, settings, gmailAdapter] = await Promise.all([
    read("lib/data.ts"),
    read("lib/email.ts"),
    read("app/admin/servicios/page.tsx"),
    read("app/admin/configuracion/page.tsx"),
    read("integrations/gmail-email-webhook.gs"),
  ]);
  assert.match(data, /api_update_service_status/);
  assert.match(data, /api_pet_detail/);
  assert.match(email, /SEND_EMAIL/);
  assert.match(services, /ServiceStatusActions/);
  assert.match(settings, /CORREO TRANSACCIONAL/);
  assert.match(gmailAdapter, /GmailApp\.sendEmail/);
  assert.doesNotMatch(`${data}${email}${settings}`, /GOOGLE_SHEETS|Google Sheets/);
});
