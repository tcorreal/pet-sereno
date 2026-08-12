import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("all public navigation targets exist", async () => {
  const shell = await read("components/site-shell.tsx");
  const publicShell = await read("components/public-shell.tsx");
  const home = await read("app/page.tsx");
  const hrefs = [...`${shell}${publicShell}${home}`.matchAll(/href="(\/[^"]*)"/g)]
    .map((match) => match[1].split(/[?#]/)[0])
    .filter((href) => href !== "/" && !href.startsWith("/admin"));

  for (const href of new Set(hrefs)) {
    await access(new URL(`app${href}/page.tsx`, root));
  }
});

test("the public site presents Pet Sereno with separate sign-in and registration", async () => {
  const [shell, home] = await Promise.all([
    read("components/public-shell.tsx"),
    read("app/page.tsx"),
  ]);
  const header = shell.match(/function SiteHeader[\s\S]*?(?=export function PublicShell)/)?.[0] ?? "";
  assert.match(header, /href="\/inicio">Inicio/);
  assert.match(header, /href="\/registro">Registro/);
  assert.doesNotMatch(header, /href="\/reservar"/);
  assert.doesNotMatch(home, /href={`\/reservar/);
  assert.match(home, /Ingresar para reservar/);
  assert.match(home, /Las funcionalidades comienzan/);
});

test("authentication supports email, Google and Outlook", async () => {
  const [form, password, oauth, session] = await Promise.all([
    read("components/auth-form.tsx"),
    read("app/api/auth/password/route.ts"),
    read("app/api/auth/oauth/route.ts"),
    read("lib/auth-session.ts"),
  ]);
  assert.match(form, /Continuar con Google/);
  assert.match(form, /Continuar con Outlook/);
  assert.match(form, /Crear cuenta/);
  assert.match(password, /passwordSignUp/);
  assert.match(password, /passwordSignIn/);
  assert.match(oauth, /provider !== "google" && provider !== "azure"/);
  assert.match(session, /HttpOnly|httpOnly/);
});

test("profile photos can be selected from the device and stored as media", async () => {
  const [form, upload, media, hosting] = await Promise.all([
    read("components/profile-form.tsx"),
    read("app/api/account/profile/photo/route.ts"),
    read("app/api/media/profile/[key]/route.ts"),
    read(".openai/hosting.json"),
  ]);
  assert.match(form, /type="file"/);
  assert.match(form, /image\/jpeg,image\/png,image\/webp/);
  assert.match(upload, /5 \* 1024 \* 1024/);
  assert.match(upload, /profileMediaBucket\(\)\.put/);
  assert.match(media, /x-content-type-options/);
  assert.equal(JSON.parse(hosting).r2, "MEDIA");
});

test("service calls to action preserve the selected service inside the account", async () => {
  const [home, legacyPage, accountPage, form] = await Promise.all([
    read("app/page.tsx"),
    read("app/reservar/page.tsx"),
    read("app/cuenta/reservas/nueva/page.tsx"),
    read("components/account-reservation-form.tsx"),
  ]);
  assert.match(home, /\/cuenta\/reservas\/nueva\?service=/);
  assert.match(legacyPage, /redirect\(`\/cuenta\/reservas\/nueva/);
  assert.match(accountPage, /initialServiceTypeId=\{query\.service\}/);
  assert.match(form, /service\.id === initialServiceTypeId/);
});

test("navigation remains functional without the unstable Vinext client router", async () => {
  const [link, navigation, sources] = await Promise.all([
    read("components/app-link.tsx"),
    read("lib/client-navigation.ts"),
    Promise.all([
      read("components/site-shell.tsx"),
      read("components/account-shell.tsx"),
      read("components/admin-shell.tsx"),
      read("components/account-pet-form.tsx"),
      read("components/account-reservation-form.tsx"),
      read("components/profile-form.tsx"),
    ]),
  ]);
  assert.match(link, /return <a href={href}/);
  assert.match(navigation, /window\.location\.assign/);
  assert.match(navigation, /window\.location\.reload/);
  for (const source of sources) {
    assert.doesNotMatch(source, /next\/link|useRouter/);
  }
});

test("interactive actions recover from API failures", async () => {
  const [helper, registration, reservation, confirmation, services] = await Promise.all([
    read("lib/client-fetch.ts"),
    read("components/registration-form.tsx"),
    read("components/reservation-form.tsx"),
    read("components/confirm-button.tsx"),
    read("components/service-status-actions.tsx"),
  ]);
  assert.match(helper, /No pudimos conectarnos/);
  for (const source of [registration, reservation, confirmation, services]) {
    assert.match(source, /fetchJson/);
  }
  assert.match(confirmation, /finally\{setBusy\(false\)\}/);
  assert.match(services, /finally \{\s*setBusy\(false\)/);
});

test("offers a local demo without changing production data", async () => {
  const [gateway, demo, example, auth, vite] = await Promise.all([
    read("lib/supabase.ts"),
    read("lib/demo-store.ts"),
    read(".env.example"),
    read("app/chatgpt-auth.ts"),
    read("vite.config.ts"),
  ]);
  assert.match(gateway, /LOCAL_DEMO_MODE/);
  assert.match(gateway, /demoRpc/);
  assert.match(demo, /api_confirm_reservation/);
  assert.match(demo, /api_update_service_status/);
  assert.match(example, /^LOCAL_DEMO_MODE=false$/m);
  assert.match(example, /^LOCAL_TEST_AUTH=false$/m);
  assert.match(auth, /process\.env\.NODE_ENV === "production"/);
  assert.match(auth, /LOCAL_TEST_AUTH/);
  assert.match(vite, /loadEnv/);
});
