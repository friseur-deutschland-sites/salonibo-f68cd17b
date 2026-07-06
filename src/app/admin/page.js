"use client";
import { useEffect, useState, useCallback } from "react";

const inputCls = "w-full border border-coffee/20 bg-cream px-3 py-2 text-coffee outline-none focus:border-terra";
const btnCls = "bg-terra px-5 py-2.5 text-sm text-cream transition-colors hover:bg-terradark disabled:opacity-40";
const btnSm = "border border-coffee/20 px-3 py-1.5 text-xs text-coffee hover:bg-terra hover:text-cream hover:border-terra transition-colors";

function api(path, key, init = {}) {
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-key": key, ...(init.headers || {}) },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Fehler");
    return data;
  });
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("termine");
  const [error, setError] = useState("");

  async function login(e) {
    e.preventDefault(); setError("");
    try {
      await api("/api/admin/settings", adminKey);
      sessionStorage.setItem("adminKey", adminKey);
      setAuthed(true);
    } catch { setError("Falsches Passwort."); }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("adminKey");
    if (saved) {
      api("/api/admin/settings", saved)
        .then(() => { setAdminKey(saved); setAuthed(true); })
        .catch(() => sessionStorage.removeItem("adminKey"));
    }
  }, []);

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-center font-display text-3xl font-semibold text-coffee">Admin-Bereich</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input type="password" placeholder="Admin-Passwort" value={adminKey}
            onChange={e => setAdminKey(e.target.value)} className={inputCls} autoFocus />
          {error && <p className="text-center text-sm text-red-700">{error}</p>}
          <button className={`${btnCls} w-full`}>Anmelden</button>
        </form>
      </main>
    );
  }

  const tabs = [["termine", "Termine"], ["mitarbeiter", "Mitarbeiter"], ["leistungen", "Leistungen"], ["fotos", "Fotos"], ["einstellungen", "Einstellungen"]];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-coffee">Admin-Bereich</h1>
      <div className="mt-6 flex gap-2 border-b border-coffee/15 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm transition-colors ${tab === id ? "border-b-2 border-terra font-semibold text-coffee" : "text-coffee/60"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "termine"       && <TermineTab adminKey={adminKey} />}
      {tab === "mitarbeiter"   && <MitarbeiterTab adminKey={adminKey} />}
      {tab === "leistungen"    && <LeistungenTab adminKey={adminKey} />}
      {tab === "fotos"         && <FotosTab adminKey={adminKey} />}
      {tab === "einstellungen" && <EinstellungenTab adminKey={adminKey} />}
    </main>
  );
}

// ── Termine ──────────────────────────────────────────────────────────────────
const EMPTY_MANUAL = { time: "10:00", durationMinutes: 30, staffId: "", guestName: "", guestPhone: "", specialRequests: "" };

function TermineTab({ adminKey }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [manualDate, setManualDate] = useState(today);
  const [staffList, setStaffList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [manualMsg, setManualMsg] = useState("");

  const load = useCallback(
    () => api(`/api/admin/appointments?date=${date}`, adminKey).then(setData).catch(e => setMsg(e.message)),
    [adminKey, date]
  );
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api("/api/admin/staff", adminKey).then(d => setStaffList((d.staff || []).filter(m => m.active))).catch(() => {});
  }, [adminKey]);

  async function changeStatus(id, status) {
    if (status === "cancelled" && !confirm("Termin stornieren?")) return;
    try {
      await api("/api/admin/appointments", adminKey, { method: "PATCH", body: JSON.stringify({ id, status }) });
      load();
    } catch (e) { setMsg(e.message); }
  }

  async function saveManual(e, force = false) {
    e?.preventDefault();
    if (!manual.guestName.trim()) { setManualMsg("Bitte Namen eingeben."); return; }
    setSaving(true); setManualMsg("");
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ ...manual, date: manualDate, force }),
      });
      const d = await res.json();
      if (res.status === 409 && d.conflict) {
        if (confirm(`${d.error}\n\nTrotzdem eintragen?`)) { await saveManual(null, true); }
        return;
      }
      if (!res.ok) { setManualMsg(d.error || "Fehler."); return; }
      setManual(EMPTY_MANUAL);
      setShowManual(false);
      if (manualDate === date) load(); else setDate(manualDate);
    } catch (err) { setManualMsg(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputCls} max-w-xs`} />
        <button onClick={() => { setShowManual(p => !p); setManualDate(date); setManualMsg(""); }} className={btnCls}>
          {showManual ? "Formular schließen" : "+ Termin eintragen"}
        </button>
      </div>

      {/* Manuel randevu formu (telefonla gelen randevular) */}
      {showManual && (
        <form onSubmit={saveManual} className="mt-5 border border-terra/30 bg-sand/30 p-5 space-y-4 max-w-2xl">
          <h3 className="font-semibold text-coffee">Termin manuell eintragen <span className="text-xs font-normal text-coffee/50">(z.B. telefonisch)</span></h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Datum</label>
              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Uhrzeit</label>
              <input type="time" value={manual.time} onChange={e => setManual(p => ({...p, time: e.target.value}))} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Dauer</label>
              <select value={manual.durationMinutes} onChange={e => setManual(p => ({...p, durationMinutes: parseInt(e.target.value)}))} className={inputCls}>
                {[15, 30, 45, 60, 75, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} Min.</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Name des Kunden</label>
              <input value={manual.guestName} onChange={e => setManual(p => ({...p, guestName: e.target.value}))} required className={inputCls} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Telefon (optional)</label>
              <input type="tel" value={manual.guestPhone} onChange={e => setManual(p => ({...p, guestPhone: e.target.value}))} className={inputCls} placeholder="+49 …" />
            </div>
            <div>
              <label className="block text-sm text-coffee/60 mb-1">Friseur/in</label>
              <select value={manual.staffId} onChange={e => setManual(p => ({...p, staffId: e.target.value}))} className={inputCls}>
                <option value="">Beliebig</option>
                {staffList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-coffee/60 mb-1">Anmerkung (optional)</label>
            <input value={manual.specialRequests} onChange={e => setManual(p => ({...p, specialRequests: e.target.value}))} className={inputCls} placeholder="z.B. Färben + Schneiden" />
          </div>
          {manualMsg && <p className="text-sm text-red-700">{manualMsg}</p>}
          <button className={btnCls} disabled={saving}>{saving ? "Wird gespeichert…" : "Termin speichern"}</button>
        </form>
      )}

      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
      {!data ? <p className="mt-6 text-coffee/60">Lädt…</p> : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee/15 text-left text-xs uppercase tracking-wider text-coffee/50">
                <th className="py-2 pr-4">Zeit</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Leistungen</th>
                <th className="py-2 pr-4">Friseur/in</th>
                <th className="py-2 pr-4">Kontakt</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee/10">
              {data.appointments?.sort((a,b) => a.appointment_time.localeCompare(b.appointment_time)).map(appt => (
                <tr key={appt.id} className={appt.status === "cancelled" ? "opacity-40 line-through" : ""}>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    {appt.appointment_time?.slice(0,5)} – {appt.appointment_end?.slice(0,5)}
                  </td>
                  <td className="py-3 pr-4">{appt.guest_name}</td>
                  <td className="py-3 pr-4 text-xs text-coffee/70 max-w-xs">
                    {appt.selected_services?.length > 0 ? appt.selected_services.map(s => s.name_de).join(", ") : "—"}
                  </td>
                  <td className="py-3 pr-4 text-xs">{appt.staff?.name || "Beliebig"}</td>
                  <td className="py-3 pr-4 text-xs">{appt.guest_phone || appt.guest_email || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-1 ${
                      appt.status === "confirmed" ? "bg-green-100 text-green-800" :
                      appt.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-sand text-coffee/60"}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {appt.status !== "cancelled" && (
                      <button onClick={() => changeStatus(appt.id, "cancelled")} className="text-xs text-red-700 hover:underline">
                        Stornieren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.appointments?.length === 0 && (
                <tr><td colSpan="7" className="py-8 text-center text-coffee/50">Keine Termine an diesem Tag.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Foto-Upload Hilfsfunktion ─────────────────────────────────────────────────
async function uploadPhoto(file, adminKey) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "x-admin-key": adminKey },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen.");
  return data.url;
}

// ── Mitarbeiter ───────────────────────────────────────────────────────────────
const EMPTY_STAFF = { name: "", gender_type: "beide", photo_url: "", bio: "", active: true };

function MitarbeiterTab({ adminKey }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_STAFF);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(
    () => api("/api/admin/staff", adminKey).then(d => setStaff(d.staff || [])).catch(e => setMsg(e.message)),
    [adminKey]
  );
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault(); setMsg("");
    try {
      if (editId) {
        await api("/api/admin/staff", adminKey, { method: "PATCH", body: JSON.stringify({ id: editId, ...form }) });
      } else {
        await api("/api/admin/staff", adminKey, { method: "POST", body: JSON.stringify(form) });
      }
      setForm(EMPTY_STAFF);
      setEditId(null); load();
    } catch (e) { setMsg(e.message); }
  }

  async function remove(id) {
    if (!confirm("Mitarbeiter löschen?")) return;
    try { await api(`/api/admin/staff?id=${id}`, adminKey, { method: "DELETE" }); load(); }
    catch (e) { setMsg(e.message); }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg("");
    try {
      const url = await uploadPhoto(file, adminKey);
      setForm(p => ({ ...p, photo_url: url }));
    } catch (err) { setMsg(err.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  const GENDER = { damen: "Nur Damen", herren: "Nur Herren", beide: "Damen & Herren" };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-4">
        <h3 className="font-semibold text-coffee">{editId ? "Mitarbeiter bearbeiten" : "Mitarbeiter hinzufügen"}</h3>
        <div>
          <label className="block text-sm text-coffee/60 mb-1">Name</label>
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm text-coffee/60 mb-1">Spezialisierung</label>
          <select value={form.gender_type} onChange={e => setForm(p => ({...p, gender_type: e.target.value}))} className={inputCls}>
            {Object.entries(GENDER).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-coffee/60 mb-1">Über mich (wird Kunden bei der Terminbuchung angezeigt)</label>
          <textarea rows={3} value={form.bio} onChange={e => setForm(p => ({...p, bio: e.target.value}))}
            className={`${inputCls} resize-none`}
            placeholder="z.B. 15 Jahre Erfahrung, spezialisiert auf Balayage und Hochzeitsfrisuren…" />
        </div>
        <div>
          <label className="block text-sm text-coffee/60 mb-1">Foto</label>
          <div className="flex items-center gap-3">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="h-14 w-14 rounded-full object-cover border border-coffee/10" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-terra/10 text-terra text-xl">?</div>
            )}
            <label className={`${btnSm} cursor-pointer`}>
              {uploading ? "Wird hochgeladen…" : form.photo_url ? "Foto ändern" : "Foto hochladen"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" disabled={uploading} />
            </label>
            {form.photo_url && (
              <button type="button" onClick={() => setForm(p => ({...p, photo_url: ""}))} className="text-xs text-red-700 hover:underline">
                Entfernen
              </button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-coffee">
          <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({...p, active: e.target.checked}))} />
          Aktiv
        </label>
        {msg && <p className="text-sm text-red-700">{msg}</p>}
        <div className="flex gap-2">
          <button className={btnCls} disabled={uploading}>{editId ? "Speichern" : "Hinzufügen"}</button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_STAFF); }} className={btnSm}>Abbrechen</button>}
        </div>
      </form>

      <div>
        <h3 className="font-semibold text-coffee mb-4">Mitarbeiter ({staff.length})</h3>
        <ul className="divide-y divide-coffee/10">
          {staff.map(m => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {m.photo_url ? <img src={m.photo_url} alt={m.name} className="h-9 w-9 rounded-full object-cover" /> :
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-terra/10"><span className="text-terra font-semibold">{m.name[0]}</span></div>}
                <div>
                  <p className="font-medium text-coffee">{m.name}</p>
                  <p className="text-xs text-coffee/50">{GENDER[m.gender_type]}{!m.active ? " · Inaktiv" : ""}</p>
                  {m.bio && <p className="text-xs text-coffee/40 line-clamp-1 max-w-xs">{m.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditId(m.id); setForm({ name: m.name, gender_type: m.gender_type, photo_url: m.photo_url || "", bio: m.bio || "", active: m.active }); }} className={btnSm}>Bearbeiten</button>
                <button onClick={() => remove(m.id)} className="text-xs text-red-700 hover:underline">Löschen</button>
              </div>
            </li>
          ))}
          {staff.length === 0 && <li className="py-4 text-sm text-coffee/50">Noch keine Mitarbeiter angelegt.</li>}
        </ul>
      </div>
    </div>
  );
}

// ── Fotos (Hero + Galerie) ────────────────────────────────────────────────────
const GALLERY_MAX = 10;

function FotosTab({ adminKey }) {
  const [images, setImages] = useState(null); // [{image_key, url}]
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(null); // key of slot being uploaded

  const load = useCallback(
    () => api("/api/admin/site-images", adminKey).then(d => setImages(d.images || [])).catch(e => setMsg(e.message)),
    [adminKey]
  );
  useEffect(() => { load(); }, [load]);

  const imgMap = {};
  for (const i of images || []) imgMap[i.image_key] = i.url;

  async function upload(key, file) {
    setBusy(key); setMsg("");
    try {
      const url = await uploadPhoto(file, adminKey);
      await api("/api/admin/site-images", adminKey, {
        method: "PUT",
        body: JSON.stringify({ image_key: key, url }),
      });
      load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(null); }
  }

  async function remove(key) {
    if (!confirm("Foto entfernen?")) return;
    setMsg("");
    try {
      await api(`/api/admin/site-images?key=${encodeURIComponent(key)}`, adminKey, { method: "DELETE" });
      load();
    } catch (e) { setMsg(e.message); }
  }

  function Slot({ imgKey, label, wide = false }) {
    const url = imgMap[imgKey];
    return (
      <div className={`border border-coffee/15 ${wide ? "col-span-2 sm:col-span-3" : ""}`}>
        <div className={`relative bg-sand/40 ${wide ? "aspect-[3/1]" : "aspect-square"}`}>
          {url ? (
            <img src={url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-coffee/30 text-sm">{label}</div>
          )}
          {busy === imgKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-coffee/40 text-cream text-sm">Lädt…</div>
          )}
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <label className="cursor-pointer text-xs text-terra hover:underline">
            {url ? "Ändern" : "Hochladen"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!!busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(imgKey, f); e.target.value = ""; }} />
          </label>
          {url && (
            <button onClick={() => remove(imgKey)} className="text-xs text-red-700 hover:underline">Entfernen</button>
          )}
        </div>
      </div>
    );
  }

  if (!images) return <p className="mt-8 text-coffee/60">Lädt…</p>;

  return (
    <div className="mt-8 space-y-10">
      {msg && <p className="text-sm text-red-700">{msg}</p>}

      <div>
        <h3 className="font-semibold text-coffee mb-1">Titelbild (Hero)</h3>
        <p className="text-xs text-coffee/50 mb-4">Das große Bild ganz oben auf Ihrer Website. Empfohlen: mind. 1920×1080, Querformat.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
          <Slot imgKey="hero" label="Titelbild" wide />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-coffee mb-1">Galerie</h3>
        <p className="text-xs text-coffee/50 mb-4">
          Bis zu {GALLERY_MAX} Fotos — Frisuren, Salon, Team. Erscheinen im Galerie-Bereich Ihrer Website.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: GALLERY_MAX }, (_, i) => (
            <Slot key={i} imgKey={`gallery_${i + 1}`} label={`Foto ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Leistungen ───────────────────────────────────────────────────────────────
function LeistungenTab({ adminKey }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(
    () => api("/api/admin/services", adminKey).then(setData).catch(e => setMsg(e.message)),
    [adminKey]
  );
  useEffect(() => { load(); }, [load]);

  async function toggle(svcId, isActive, salonSvcId) {
    setMsg("");
    try {
      if (isActive) {
        await api("/api/admin/services", adminKey, {
          method: "POST",
          body: JSON.stringify({ catalog_id: svcId }),
        });
      } else {
        await api("/api/admin/services", adminKey, {
          method: "DELETE",
          body: JSON.stringify({ id: salonSvcId }),
        });
      }
      load();
    } catch (e) { setMsg(e.message); }
  }

  async function updateOverride(salonSvcId, field, value) {
    try {
      await api("/api/admin/services", adminKey, {
        method: "PATCH",
        body: JSON.stringify({ id: salonSvcId, [field]: value }),
      });
    } catch (e) { setMsg(e.message); }
  }

  if (!data) return <p className="mt-8 text-coffee/60">Lädt…</p>;

  const CAT_LABELS = { damen: "Damen", herren: "Herren", kinder: "Kinder", unisex: "Unisex" };
  const cats = ["damen", "herren", "kinder", "unisex"].filter(c => data.catalog.some(s => s.category === c));

  return (
    <div className="mt-8">
      <p className="text-sm text-coffee/60 mb-6">Wählen Sie aus dem Katalog aus, welche Leistungen Ihr Salon anbietet. Sie können Dauer und Preis individuell anpassen.</p>
      {msg && <p className="mb-4 text-sm text-red-700">{msg}</p>}
      {cats.map(cat => (
        <div key={cat} className="mb-8">
          <h3 className="mb-3 border-b border-coffee/10 pb-2 font-display font-semibold text-coffee">{CAT_LABELS[cat] || cat}</h3>
          <div className="space-y-2">
            {data.catalog.filter(s => s.category === cat).map(svc => {
              const salon = data.salon_services.find(ss => ss.catalog_id === svc.id);
              return (
                <div key={svc.id} className={`flex flex-wrap items-center gap-3 border px-4 py-3 ${salon ? "border-terra/30 bg-sand/40" : "border-coffee/10"}`}>
                  <input type="checkbox" checked={!!salon} onChange={e => toggle(svc.id, e.target.checked, salon?.id)} className="accent-terra" />
                  <span className={`flex-1 text-sm ${salon ? "text-coffee font-medium" : "text-coffee/60"}`}>{svc.name_de}</span>
                  {salon && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min="5" step="5"
                          defaultValue={salon.custom_minutes || svc.default_minutes}
                          onBlur={e => updateOverride(salon.id, "custom_minutes", parseInt(e.target.value))}
                          className="w-16 border border-coffee/20 bg-cream px-2 py-1 text-center text-sm" />
                        <span className="text-xs text-coffee/50">Min.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min="0" step="0.5"
                          defaultValue={salon.price_eur || ""}
                          placeholder="Preis"
                          onBlur={e => updateOverride(salon.id, "price_eur", e.target.value || null)}
                          className="w-20 border border-coffee/20 bg-cream px-2 py-1 text-center text-sm" />
                        <span className="text-xs text-coffee/50">€</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Einstellungen ──────────────────────────────────────────────────────────────
function EinstellungenTab({ adminKey }) {
  const [s, setS] = useState(null);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/admin/settings", adminKey).then(d => { setS(d.settings); setSmsAvailable(d.smsAvailable); });
  }, [adminKey]);

  if (!s) return <p className="mt-8 text-coffee/60">Lädt…</p>;

  async function save(e) {
    e.preventDefault(); setMsg("");
    try {
      await api("/api/admin/settings", adminKey, { method: "PUT", body: JSON.stringify(s) });
      setMsg("✓ Gespeichert");
    } catch (err) { setMsg(err.message); }
  }

  const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  return (
    <form onSubmit={save} className="mt-8 max-w-lg space-y-6">

      <fieldset className="space-y-3 border border-coffee/10 p-5">
        <legend className="text-sm font-semibold text-coffee px-1">Termindauer</legend>
        <label className="flex items-center gap-3 text-sm text-coffee">
          <input type="checkbox" checked={s.allow_service_selection}
            onChange={e => setS({...s, allow_service_selection: e.target.checked})} className="accent-terra" />
          Kunden können Leistungen selbst wählen
        </label>
        {!s.allow_service_selection && (
          <label className="block">
            <span className="mb-1 block text-sm text-coffee/60">Durchschnittliche Termindauer (Minuten)</span>
            <input type="number" min="15" step="5" value={s.avg_appointment_minutes || 60} className={inputCls}
              onChange={e => setS({...s, avg_appointment_minutes: parseInt(e.target.value)})} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/60">Zeitraster für Terminslots (Minuten)</span>
          <select value={s.slot_interval_minutes || 15} className={inputCls}
            onChange={e => setS({...s, slot_interval_minutes: parseInt(e.target.value)})}>
            {[10, 15, 20, 30].map(v => <option key={v} value={v}>{v} Minuten</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/60">Max. Vorlaufzeit (Tage)</span>
          <input type="number" min="1" value={s.max_advance_days || 30} className={inputCls}
            onChange={e => setS({...s, max_advance_days: parseInt(e.target.value)})} />
        </label>
      </fieldset>

      <fieldset className="space-y-3 border border-coffee/10 p-5">
        <legend className="text-sm font-semibold text-coffee px-1">Öffnungszeiten</legend>
        <p className="text-xs text-coffee/50">Format: "09:00–18:00" oder "Ruhetag"</p>
        {DAYS.map(day => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-28 text-sm text-coffee/70">{day}</span>
            <input value={(s.opening_hours || {})[day] || ""}
              onChange={e => setS({...s, opening_hours: {...(s.opening_hours||{}), [day]: e.target.value}})}
              className={`${inputCls} text-sm`} placeholder="Ruhetag" />
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3 border border-coffee/10 p-5">
        <legend className="text-sm font-semibold text-coffee px-1">Bestätigung</legend>
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/60">Bestätigungsmethode</span>
          <select value={s.verification_method || "email"} className={inputCls}
            onChange={e => setS({...s, verification_method: e.target.value})}>
            <option value="email">E-Mail-Code</option>
            <option value="sms" disabled={!smsAvailable}>SMS-Code {smsAvailable ? "" : "(noch nicht eingerichtet)"}</option>
          </select>
        </label>
      </fieldset>

      <div className="flex items-center gap-4">
        <button className={btnCls}>Einstellungen speichern</button>
        {msg && <span className="text-sm text-coffee/70">{msg}</span>}
      </div>
    </form>
  );
}
