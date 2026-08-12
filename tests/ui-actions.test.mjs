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

test("the primary header only offers home and registration", async () => {
  const [shell, home] = await Promise.all([
    read("components/site-shell.tsx"),
    read("app/page.tsx"),
  ]);
  const header = shell.match(/export function SiteHeader[\s\S]*?(?=export function SiteFooter)/)?.[0] ?? "";
  assert.match(header, /href="\/">Inicio/);
  assert.match(header, /href="\/registro">Registro/);
  assert.doesNotMatch(header, /href="\/reservar"/);
  assert.doesNotMatch(home, /className="hero-actions"/);
});

test("service calls to action preserve the selected service", async () => {
  const [home, page, form] = await Promise.all([
    read("app/page.tsx"),
    read("app/reservar/page.tsx"),
    read("components/reservation-form.tsx"),
  ]);
  assert.match(home, /\/reservar\?service=/);
  assert.match(page, /initialServiceTypeId=\{params\.service\}/);
  assert.match(form, /service\.id===initialServiceTypeId/);
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
