"use client";
import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const STEPS = ["Geschlecht", "Friseur", "Leistungen", "Datum & Uhrzeit", "Kontakt", "Bestätigung"];

// ── Adım 1: Cinsiyet seçimi ───────────────────────────────────────────────────
function StepGender({ onSelect }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="font-display text-3xl font-semibold text-coffee">Für wen ist der Termin?</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 w-full max-w-xs">
        {[["damen", "Damen"], ["herren", "Herren"]].map(([val, label]) => (
          <button key={val} onClick={() => onSelect(val)}
            className="border border-coffee/20 py-8 font-display text-xl text-coffee hover:bg-terra hover:text-cream hover:border-terra transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Adım 2: Çalışan seçimi ────────────────────────────────────────────────────
function StepStaff({ gender, onSelect }) {
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    fetch(`/api/staff?gender=${gender}`)
      .then(r => r.json()).then(setStaff).catch(() => setStaff([]));
  }, [gender]);

  const GENDER_LABELS = { damen: "Damen", herren: "Herren", beide: "Damen & Herren" };

  return (
    <div className="py-6">
      <h2 className="font-display text-2xl font-semibold text-coffee text-center mb-6">Friseur/in wählen</h2>
      {!staff ? <p className="text-center text-coffee/50">Wird geladen…</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onSelect(null)}
            className="border border-coffee/20 py-5 text-sm text-coffee/70 hover:bg-terra hover:text-cream hover:border-terra transition-colors">
            Kein Friseur bevorzugt
          </button>
          {staff.map(m => (
            <div key={m.id} className="relative group">
              <button onClick={() => onSelect(m)}
                className="w-full border border-coffee/20 py-5 text-left px-5 hover:bg-terra hover:text-cream hover:border-terra transition-colors">
                <div className="flex items-center gap-3">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-terra/10 group-hover:bg-cream/20">
                      <span className="font-display text-xl text-terra group-hover:text-cream">{m.name[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee group-hover:text-cream">{m.name}</p>
                    <p className="text-xs text-coffee/50 group-hover:text-cream/70">{GENDER_LABELS[m.gender_type]}</p>
                    {/* Mobilde hover olmadığı için bio kart içinde kısaca görünür */}
                    {m.bio && (
                      <p className="mt-1 text-xs text-coffee/40 group-hover:text-cream/60 line-clamp-2 sm:hidden">{m.bio}</p>
                    )}
                  </div>
                </div>
              </button>
              {/* Hover bilgi kartı (masaüstü) */}
              {m.bio && (
                <div className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-2 hidden w-72 -translate-x-1/2 sm:group-hover:block">
                  <div className="bg-coffee text-cream text-xs leading-relaxed p-4 shadow-xl">
                    <div className="flex items-center gap-2.5 mb-2">
                      {m.photo_url && <img src={m.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                      <span className="font-semibold text-sm">{m.name}</span>
                    </div>
                    {m.bio}
                  </div>
                  <div className="mx-auto h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-coffee" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Adım 3: Hizmet seçimi ─────────────────────────────────────────────────────
function StepServices({ gender, settings, onSelect }) {
  const [catalog, setCatalog] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!settings.allow_service_selection) { onSelect([], settings.avg_appointment_minutes || 60); return; }
    fetch("/api/services").then(r => r.json()).then(data => {
      const filtered = data.filter(s => s.category === gender || s.category === "kinder" || s.category === "unisex");
      setCatalog(filtered);
    }).catch(() => setCatalog([]));
  }, [gender]);

  if (!settings.allow_service_selection) return null;

  const toggle = (svc) => {
    setSelected(prev => prev.find(s => s.id === svc.id)
      ? prev.filter(s => s.id !== svc.id)
      : [...prev, svc]);
  };

  const totalMin = selected.reduce((s, svc) => s + (svc.duration_minutes || 30), 0) || settings.avg_appointment_minutes || 60;
  const isSelected = (id) => selected.some(s => s.id === id);

  return (
    <div className="py-6">
      <h2 className="font-display text-2xl font-semibold text-coffee text-center mb-2">Leistungen wählen</h2>
      <p className="text-center text-coffee/50 text-sm mb-6">Wählen Sie eine oder mehrere Leistungen</p>

      {!catalog ? <p className="text-center text-coffee/50">Wird geladen…</p> : (
        <>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {catalog.map(svc => (
              <button key={svc.id} onClick={() => toggle(svc)}
                className={`w-full flex items-center justify-between border px-4 py-3 text-left transition-colors ${
                  isSelected(svc.id) ? "border-terra bg-terra text-cream" : "border-coffee/20 text-coffee hover:border-terra/50"
                }`}>
                <span>{svc.name_de}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="opacity-70">{svc.duration_minutes} Min.</span>
                  {svc.price_eur && <span className="font-medium">{Number(svc.price_eur).toFixed(2)} €</span>}
                  {isSelected(svc.id) && <span className="text-lg">✓</span>}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-coffee/10 pt-4 flex items-center justify-between">
            <div className="text-sm text-coffee/60">
              {selected.length > 0 && (
                <><strong className="text-coffee">{selected.length} Leistung(en)</strong> — ca. {totalMin} Min.</>
              )}
            </div>
            <button onClick={() => onSelect(selected, totalMin)}
              disabled={selected.length === 0}
              className="bg-terra px-8 py-3 text-sm text-cream tracking-widest hover:bg-terradark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Weiter
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Adım 4: Tarih & Saat ──────────────────────────────────────────────────────
function StepDateTime({ totalMinutes, staffId, settings, onSelect }) {
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (settings.max_advance_days || 30));
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSlots = async (d) => {
    setLoading(true); setSlots(null);
    try {
      const res = await fetch("/api/appointments/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: d, totalMinutes, staffId }),
      });
      const data = await res.json();
      setSlots(data);
    } catch { setSlots({ error: true }); }
    setLoading(false);
  };

  useEffect(() => { fetchSlots(date); }, [date]);

  return (
    <div className="py-6">
      <h2 className="font-display text-2xl font-semibold text-coffee text-center mb-6">Datum & Uhrzeit</h2>
      <div className="mb-6">
        <label className="block text-sm text-coffee/60 mb-2">Datum wählen</label>
        <input type="date" value={date} min={today} max={maxDate.toISOString().slice(0,10)}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-coffee/20 px-4 py-3 text-coffee focus:outline-none focus:border-terra" />
      </div>

      {loading && <p className="text-center text-coffee/50 py-6">Freie Termine werden gesucht…</p>}
      {slots?.closed && <p className="text-center text-coffee/50 py-4">An diesem Tag ist der Salon geschlossen.</p>}
      {slots?.error && <p className="text-center text-red-500 py-4">Termine konnten nicht geladen werden.</p>}

      {slots && !slots.closed && !slots.error && (
        <div>
          {slots.slots?.length === 0 ? (
            <p className="text-center text-coffee/50 py-4">Leider keine freien Termine an diesem Tag.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {slots.slots.map(time => (
                <button key={time} onClick={() => onSelect(date, time)}
                  className="border border-coffee/20 py-3 text-sm text-coffee hover:bg-terra hover:text-cream hover:border-terra transition-colors">
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Adım 5: Kişisel bilgiler ──────────────────────────────────────────────────
function StepContact({ date, time, totalMinutes, services, staff, gender, settings, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", requests: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpStep, setOtpStep] = useState(null);
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");

  const handleSubmit = async () => {
    if (!form.name) { setError("Bitte Namen eingeben."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, time, totalMinutes,
          staffId: staff?.id || null,
          selectedServices: services,
          guestGender: gender,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Fehler beim Senden."); }
      else { setOtpStep({ requestId: data.requestId, channel: data.channel, sentTo: data.sentTo }); }
    } catch { setError("Netzwerkfehler. Bitte versuchen Sie es erneut."); }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) { setOtpError("Bitte 6-stelligen Code eingeben."); return; }
    setLoading(true); setOtpError("");
    try {
      const res = await fetch("/api/appointments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: otpStep.requestId, code }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error || "Falscher Code."); }
      else { onSubmit(data.appointment); }
    } catch { setOtpError("Netzwerkfehler."); }
    setLoading(false);
  };

  const dateStr = new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (otpStep) {
    const channelText = otpStep.channel === "sms" ? "SMS" : "E-Mail";
    return (
      <div className="py-6 max-w-sm mx-auto">
        <h2 className="font-display text-2xl font-semibold text-coffee text-center mb-4">Code eingeben</h2>
        <p className="text-center text-coffee/60 text-sm mb-6">
          Wir haben einen 6-stelligen Code per {channelText} an <strong>{otpStep.sentTo}</strong> gesendet.
        </p>
        <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)}
          placeholder="123456"
          className="w-full border border-coffee/20 px-4 py-4 text-center text-2xl tracking-[0.5em] text-coffee focus:outline-none focus:border-terra" />
        {otpError && <p className="mt-2 text-center text-sm text-red-600">{otpError}</p>}
        <button onClick={handleVerify} disabled={loading}
          className="mt-4 w-full bg-terra py-4 text-sm uppercase tracking-widest text-cream hover:bg-terradark transition-colors disabled:opacity-50">
          {loading ? "Wird geprüft…" : "Termin bestätigen"}
        </button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="font-display text-2xl font-semibold text-coffee text-center mb-4">Ihre Kontaktdaten</h2>
      <div className="mb-6 bg-sand/50 p-4 rounded text-sm text-coffee/70">
        <p><strong>{dateStr}</strong> um <strong>{time} Uhr</strong></p>
        {staff && <p>Friseur/in: <strong>{staff.name}</strong></p>}
        {services.length > 0 && <p>{services.map(s => s.name_de).join(", ")} (ca. {totalMinutes} Min.)</p>}
      </div>

      <div className="space-y-4">
        {[
          ["name", "Name *", "text", true],
          ["email", settings.verification_method === "sms" ? "E-Mail" : "E-Mail *", "email", settings.verification_method !== "sms"],
          ["phone", settings.verification_method === "sms" ? "Telefon *" : "Telefon", "tel", settings.verification_method === "sms"],
        ].map(([key, label, type, req]) => (
          <div key={key}>
            <label className="block text-sm text-coffee/60 mb-1">{label}</label>
            <input type={type} value={form[key]} required={req}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              className="w-full border border-coffee/20 px-4 py-3 text-coffee focus:outline-none focus:border-terra" />
          </div>
        ))}
        <div>
          <label className="block text-sm text-coffee/60 mb-1">Anmerkungen (optional)</label>
          <textarea rows={3} value={form.requests} onChange={e => setForm(p => ({ ...p, requests: e.target.value }))}
            className="w-full border border-coffee/20 px-4 py-3 text-coffee focus:outline-none focus:border-terra resize-none" />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button onClick={handleSubmit} disabled={loading}
        className="mt-6 w-full bg-terra py-4 text-sm uppercase tracking-widest text-cream hover:bg-terradark transition-colors disabled:opacity-50">
        {loading ? "Wird gesendet…" : "Bestätigungscode anfordern"}
      </button>
    </div>
  );
}

// ── Adım 6: Onay ─────────────────────────────────────────────────────────────
function StepDone({ appointment }) {
  const dateStr = new Date(`${appointment.date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-terra/10">
        <svg className="h-8 w-8 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-3xl font-semibold text-coffee">Ihr Termin ist bestätigt!</h2>
      <div className="mt-6 inline-block bg-sand/50 px-8 py-6 text-left">
        <p className="text-coffee"><strong>Datum:</strong> {dateStr}</p>
        <p className="text-coffee"><strong>Uhrzeit:</strong> {appointment.time} – {appointment.appointmentEnd} Uhr</p>
        {appointment.selectedServices?.length > 0 && (
          <p className="text-coffee"><strong>Leistungen:</strong> {appointment.selectedServices.map(s => s.name_de).join(", ")}</p>
        )}
      </div>
      <p className="mt-6 text-coffee/50 text-sm">Eine Bestätigungsmail wurde an Sie gesendet.</p>
      <a href="/" className="mt-8 inline-block border border-coffee/20 px-8 py-3 text-sm text-coffee hover:bg-coffee hover:text-cream transition-colors">
        Zurück zur Startseite
      </a>
    </div>
  );
}

// ── Ana Termin Sayfası ────────────────────────────────────────────────────────
export default function TerminPage() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [staff, setStaff] = useState(undefined); // undefined = seçilmedi, null = "herhangi biri"
  const [services, setServices] = useState([]);
  const [totalMinutes, setTotalMinutes] = useState(60);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [settings, setSettings] = useState({ allow_service_selection: true, avg_appointment_minutes: 60, max_advance_days: 30 });

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  const stepLabels = ["Geschlecht", "Friseur", settings.allow_service_selection ? "Leistungen" : null, "Termin", "Kontakt", "Fertig"].filter(Boolean);
  const currentLabel = appointment ? "Fertig" : (stepLabels[step] || "");

  if (appointment) return (
    <><Navbar /><main className="min-h-screen bg-cream py-16"><div className="mx-auto max-w-xl px-4"><StepDone appointment={appointment} /></div></main><Footer /></>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream py-16">
        <div className="mx-auto max-w-xl px-4">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between text-xs text-coffee/40 mb-3">
              {stepLabels.map((l, i) => (
                <span key={l} className={`${i === step ? "text-terra font-semibold" : ""}`}>{l}</span>
              ))}
            </div>
            <div className="h-1 bg-sand rounded">
              <div className="h-1 bg-terra rounded transition-all duration-300" style={{ width: `${((step + 1) / stepLabels.length) * 100}%` }} />
            </div>
          </div>

          {step === 0 && (
            <StepGender onSelect={g => { setGender(g); setStep(1); }} />
          )}
          {step === 1 && (
            <StepStaff gender={gender} onSelect={m => { setStaff(m); setStep(2); }} />
          )}
          {step === 2 && settings.allow_service_selection && (
            <StepServices gender={gender} settings={settings} onSelect={(svcs, mins) => { setServices(svcs); setTotalMinutes(mins); setStep(3); }} />
          )}
          {step === (settings.allow_service_selection ? 3 : 2) && (
            <StepDateTime totalMinutes={totalMinutes} staffId={staff?.id || null} settings={settings}
              onSelect={(d, t) => { setDate(d); setTime(t); setStep(settings.allow_service_selection ? 4 : 3); }} />
          )}
          {step === (settings.allow_service_selection ? 4 : 3) && (
            <StepContact date={date} time={time} totalMinutes={totalMinutes} services={services}
              staff={staff} gender={gender} settings={settings}
              onSubmit={appt => setAppointment(appt)} />
          )}

          {step > 0 && (
            <button onClick={() => setStep(s => Math.max(0, s - 1))}
              className="mt-6 text-sm text-coffee/40 hover:text-coffee transition-colors">
              ← Zurück
            </button>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
