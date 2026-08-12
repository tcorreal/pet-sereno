import Link from "next/link";
import { AdminHeader, StatusBadge } from "../../../components/admin-shell";
import { listPets } from "../../../lib/data";

export const dynamic = "force-dynamic";

export default async function Mascotas() {
  const rows = await listPets();
  return <><AdminHeader eyebrow="COMPAÑEROS DEL CLUB" title="Mascotas" copy="Cada perfil reúne su información y todo el historial de servicios."/>
    <div className="toolbar"><label className="search-field">⌕ <input placeholder="Buscar mascota o propietario" aria-label="Buscar mascotas"/></label><select aria-label="Filtrar por especie"><option>Todas las especies</option><option>Perro</option><option>Gato</option></select></div>
    <div className="pet-admin-grid">{rows.map((pet) => <Link className="pet-admin-card" href={`/admin/mascotas/${pet.id}`} key={String(pet.id)}>
      <div className="pet-admin-card__visual"><span>{String(pet.name).slice(0,1)}</span><StatusBadge status={String(pet.status)}/></div>
      <div><h3>{String(pet.name)}</h3><p>{String(pet.species)} · {String(pet.breed || "Sin raza indicada")}</p><dl>
        <div><dt>Familia</dt><dd>{String(pet.owner_name)}</dd></div><div><dt>Servicios</dt><dd>{String(pet.service_count ?? 0)}</dd></div><div><dt>Edad</dt><dd>{pet.approximate_age ? `${pet.approximate_age} años` : "Sin indicar"}</dd></div>
      </dl></div>
    </Link>)}</div>
  </>;
}
