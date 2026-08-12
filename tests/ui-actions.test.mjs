import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("all public navigation targets exist", async () => {
  const shell = await read("components/site-shell.tsx");
  const home = await read("app/page.tsx");
  const hrefs = [...`${shell}${home}`.matchAll(/href="(\/[^"]*)"/g)]
    .map((match) => match[1].split(/[?#]/)[0])
    .filter((href) => href !== "/" && !href.startsWith("/admin"));

  for (const href of new Set(hrefs)) {
    await access(new URL(`app${href}/page.tsx`, root));
  }
});

test("the public site presents Pet Sereno and sends functionality behind sign-in", async () => {
  const [shell, home] = await Promise.all([
    read("components/site-shell.tsx"),
    read("app/page.tsx"),
  ]);
  const header = shell.match(/export function SiteHeader[\s\S]*?(?=export function SiteFooter)/)?.[0] ?? "";
  assert.match(header, /href="\/">Inicio/);
  assert.match(header, /href="\/cuenta">Ingresar/);
  assert.doesNotMatch(header, /href="\/registro"/);
  assert.doesNotMatch(header, /href="\/reservar"/);
  assert.doesNotMatch(home, /href={`\/reservar/);
  assert.match(home, /Ingresar para reservar/);
  assert.match(home, /Las funcionalidades comienzan/);
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
  const [gateway, demo, example] = await Promise.all([
    read("lib/supabase.ts"),
    read("lib/demo-store.ts"),
    read(".env.example"),
  ]);
  assert.match(gateway, /LOCAL_DEMO_MODE/);
  assert.match(gateway, /demoRpc/);
  assert.match(demo, /api_confirm_reservation/);
  assert.match(demo, /api_update_service_status/);
  assert.match(example, /^LOCAL_DEMO_MODE=false$/m);
});
