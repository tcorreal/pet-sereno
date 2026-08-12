import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260811190000_account_memberships_and_reservations.sql", import.meta.url), "utf8");
const accountApi = await readFile(new URL("../lib/account.ts", import.meta.url), "utf8");
const apiAuth = await readFile(new URL("../lib/api-auth.ts", import.meta.url), "utf8");

test("1. crear mascota crea propietario activo con todos los permisos", () => {
  assert.match(migration, /insert into public\.pet_memberships[\s\S]*'OWNER', 'ACTIVE'[\s\S]*true, true, true, true/i);
});

test("2. una mascota no puede superar dos propietarios", () => {
  assert.match(migration, /new\.role = 'OWNER' and current_count >= 2/);
  assert.match(migration, /máximo de 2 propietarios/);
});

test("3. una mascota no puede superar cinco responsables", () => {
  assert.match(migration, /new\.role = 'RESPONSIBLE' and current_count >= 5/);
  assert.match(migration, /5 responsables/);
});

test("los límites de membresía bloquean carreras con advisory lock", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(new\.pet_id::text, 0\)\)/);
});

test("4 y 5. responsable necesita can_create_reservations para reservar", () => {
  assert.match(migration, /membership\.role <> 'OWNER' and not membership\.can_create_reservations/);
  assert.match(migration, /api_create_account_reservation/);
});

test("6 y 7. cualquier propietario o responsable autorizado puede cancelar", () => {
  assert.match(migration, /membership\.role <> 'OWNER' and not membership\.can_cancel_reservations/);
  assert.match(migration, /api_cancel_account_reservation/);
});

test("8. responsable sin permiso no puede cancelar", () => {
  assert.match(migration, /raise exception 'No tienes autorización para realizar esta acción\.'/);
});

test("9. recogida requiere vínculo activo, permiso y autorización de la reserva", () => {
  assert.match(migration, /has_operation_permission\(account\.id,reservation\.pet_id,operation_name\)/);
  assert.match(migration, /reservation_authorized_people[\s\S]*authorization_type=operation_name/);
});

test("10. código expirado falla", () => {
  assert.match(migration, /access_code\.expires_at <= now\(\)/);
  assert.match(migration, /El código ha expirado/);
});

test("11. código usado previamente falla", () => {
  assert.match(migration, /access_code\.used_at is not null/);
  assert.match(migration, /El código ya fue utilizado/);
});

test("los códigos se guardan con hash y son independientes por operación", () => {
  assert.match(migration, /code_hash bytea not null/);
  assert.match(migration, /extensions\.digest\(plain_code,'sha256'\)/);
  assert.match(migration, /operation text not null check \(operation in \('DROPOFF','PICKUP'\)\)/);
});

test("12. propietario puede modificar permisos y se crea auditoría por cada cambio", () => {
  assert.match(migration, /actor := private\.assert_owner\(p_auth_subject, target\.pet_id\)/);
  assert.match(migration, /insert into public\.pet_permission_audit/);
});

test("13. responsable no puede editar sus permisos", () => {
  assert.match(migration, /api_update_member_permissions[\s\S]*private\.assert_owner/);
});

test("14. pet_id y reservation_id se vuelven a autorizar en backend", () => {
  assert.match(migration, /private\.active_membership\(p_auth_subject, \(p_input->>'petId'\)::uuid\)/);
  assert.match(migration, /membership := private\.active_membership\(p_auth_subject,reservation\.pet_id\)/);
  assert.match(apiAuth, /getChatGPTUser/);
  assert.match(accountApi, /p_auth_subject: user\.userId/);
});

test("las tablas nuevas tienen RLS y la API exige token de aplicación", () => {
  for (const table of ["profiles", "pet_memberships", "pet_permission_audit", "reservation_authorized_people", "reservation_access_codes", "reservation_operations", "reservation_status_history"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /private\.assert_app_token\(p_app_token\)/);
});
