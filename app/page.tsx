"use client";

import { useMemo, useState } from "react";

import { assignCredits, buildCredits, detectCreditColumn, parseReport, toCsv, toReportCsv, type ReportRow } from "@/lib/credits";
import { buildAttendees, detectColumns, parseCsv, type Attendee, type ColumnMapping, type Table } from "@/lib/csv";

import { Confetti } from "./confetti";
import { downloadCsv, stamp } from "./download";
import { Dropzone } from "./dropzone";
import { ReportDashboard } from "./report-dashboard";

type Tab = "send" | "report";
type Stage = "setup" | "sending" | "done";
type Loaded = { file: string; table: Table };
type SendResult = { email: string; credit: string; status: "sent" | "failed"; error: string };

const EMPTY_TABLE: Table = { headers: [], rows: [] };

async function readTable(file: File): Promise<Table> {
  const table = parseCsv(await file.text());
  if (table.rows.length === 0) throw new Error(`${file.name} está vacío o solo tiene encabezados.`);
  return table;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("send");
  const [stage, setStage] = useState<Stage>("setup");
  const [users, setUsers] = useState<Loaded | null>(null);
  const [credits, setCredits] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ email: -1, name: [] });
  const [creditCol, setCreditCol] = useState(-1);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<{ rows: ReportRow[]; pending: Attendee[] } | null>(null);
  const [savedReport, setSavedReport] = useState<ReportRow[] | null>(null);

  const people = useMemo(
    () => (users && mapping.email !== -1 ? buildAttendees(users.table, mapping) : { attendees: [], invalid: [], duplicates: 0 }),
    [users, mapping],
  );
  const creditList = useMemo(() => (credits && creditCol !== -1 ? buildCredits(credits.table, creditCol) : []), [credits, creditCol]);
  const plan = useMemo(() => assignCredits(people.attendees, creditList), [people.attendees, creditList]);

  async function loadUsers(file: File) {
    setError("");
    try {
      const table = await readTable(file);
      setUsers({ file: file.name, table });
      setMapping(detectColumns(table));
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo leer el archivo."); }
  }

  async function loadCredits(file: File) {
    setError("");
    try {
      const table = await readTable(file);
      setCredits({ file: file.name, table });
      setCreditCol(detectCreditColumn(table));
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo leer el archivo."); }
  }

  async function loadReport(file: File) {
    setError("");
    try { setSavedReport(parseReport(await file.text())); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo leer el reporte."); }
  }

  async function send() {
    setError("");
    setStage("sending");
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, assignments: plan.assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar.");
      const byCredit = new Map((data.results as SendResult[]).map((r) => [r.credit, r]));
      const rows: ReportRow[] = [
        ...plan.assignments.map((a) => {
          const r = byCredit.get(a.credit);
          return { credit: a.credit, status: r?.status ?? "failed", name: a.name, email: a.email, error: r?.error ?? "Sin respuesta" } as ReportRow;
        }),
        ...plan.unusedCredits.map((c) => ({ credit: c, status: "free", name: "", email: "", error: "" }) as ReportRow),
      ];
      setReport({ rows, pending: plan.usersWithoutCredit });
      setStage("done");
      downloadCsv(`reporte-creditos-${stamp()}.csv`, toReportCsv(rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
      setStage("setup");
    }
  }

  function reset() {
    setStage("setup");
    setUsers(null);
    setCredits(null);
    setReport(null);
    setMapping({ email: -1, name: [] });
    setCreditCol(-1);
  }

  const ready = plan.assignments.length > 0;
  const sentCount = report?.rows.filter((r) => r.status === "sent").length ?? 0;

  return (
    <main className="shell wide">
      <span className="eyebrow"><span className="dot" /> OpenAI Event</span>
      <h1 className="title">Créditos de <span className="shine">ChatGPT</span>,<br />directo al correo.</h1>
      <p className="lead">
        Sube el CSV de asistentes y el CSV de créditos. A cada persona le llega un enlace para armar el QR de su crédito.
        Al final descargas el reporte de qué créditos se usaron.
      </p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "send"} className={tab === "send" ? "on" : ""} onClick={() => { setTab("send"); setError(""); }}>✉️ Enviar créditos</button>
        <button role="tab" aria-selected={tab === "report"} className={tab === "report" ? "on" : ""} onClick={() => { setTab("report"); setError(""); }}>📊 Ver reporte</button>
      </div>

      {tab === "report" && (
        <section className="panel">
          <Dropzone icon="📊" title="Sube un reporte de créditos" hint="el archivo reporte-creditos-….csv que se descarga tras cada envío"
            loaded={savedReport ? { file: "Reporte", detail: `${savedReport.length} créditos` } : null} onFile={loadReport} />
          {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
          {savedReport && <ReportDashboard rows={savedReport} />}
        </section>
      )}

      {tab === "send" && stage === "setup" && (
        <section className="panel">
          <div className="drops">
            <Dropzone icon="👥" title="1 · CSV de usuarios" hint="nombre y correo de cada asistente"
              loaded={users ? { file: users.file, detail: `${users.table.rows.length} filas` } : null} onFile={loadUsers} />
            <Dropzone icon="🎟️" title="2 · CSV de créditos" hint="un código o enlace de ChatGPT por fila"
              loaded={credits ? { file: credits.file, detail: `${credits.table.rows.length} filas` } : null} onFile={loadCredits} />
          </div>
          {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

          {users && credits && (
            <div className="setup">
              <h3 className="step-title">3 · Confirma los campos</h3>
              <div className="mapping">
                <ColumnSelect label="Correo del usuario" value={mapping.email} headers={users.table.headers}
                  onChange={(email) => setMapping((m) => ({ ...m, email }))} />
                <ColumnSelect label="Nombre" value={mapping.name[0] ?? -1} headers={users.table.headers} optional
                  onChange={(col) => setMapping((m) => ({ ...m, name: col === -1 ? [] : [col, ...m.name.slice(1)] }))} />
                <ColumnSelect label="Apellido (opcional)" value={mapping.name[1] ?? -1} headers={users.table.headers} optional disabled={mapping.name.length === 0}
                  onChange={(col) => setMapping((m) => ({ ...m, name: col === -1 ? m.name.slice(0, 1) : [m.name[0], col] }))} />
                <ColumnSelect label="Crédito" value={creditCol} headers={credits.table.headers} onChange={setCreditCol} />
              </div>
              {mapping.email === -1 && <p className="error">No encontramos la columna de correo: elígela arriba.</p>}
              {creditCol === -1 && <p className="error">No encontramos la columna de créditos: elígela arriba.</p>}

              <h3 className="step-title">4 · Revisa la asignación</h3>
              <div className="stats">
                <div className="stat"><b>{people.attendees.length}</b><small>usuarios válidos{people.invalid.length + people.duplicates ? ` (${people.invalid.length} sin correo, ${people.duplicates} repetidos)` : ""}</small></div>
                <div className="stat"><b>{creditList.length}</b><small>créditos disponibles</small></div>
                <div className="stat st-sent"><b>{plan.assignments.length}</b><small>correos a enviar</small></div>
              </div>
              {plan.usersWithoutCredit.length > 0 && (
                <p className="warn">⚠️ Faltan créditos: {plan.usersWithoutCredit.length} usuarios no recibirán nada en este envío. Quedarán en “usuarios pendientes”.</p>
              )}
              {plan.unusedCredits.length > 0 && <p className="note">Sobran {plan.unusedCredits.length} créditos: quedarán como libres en el reporte.</p>}

              <div className="list">
                {plan.assignments.slice(0, 50).map((a, i) => (
                  <div className="row assign" key={a.email} style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
                    <span>{a.name}</span><span className="mail">{a.email}</span><code>{a.credit}</code>
                  </div>
                ))}
                {plan.assignments.length > 50 && <div className="row"><span className="mail">…y {plan.assignments.length - 50} más</span></div>}
              </div>
              <button className="btn small ghost" style={{ marginBottom: 16 }} disabled={!ready}
                onClick={() => downloadCsv(`asignacion-previa-${stamp()}.csv`, toCsv(["nombre", "email", "credito"], plan.assignments.map((a) => [a.name, a.email, a.credit])))}>
                ⬇ Descargar asignación (antes de enviar)
              </button>

              <input className="field" type="password" placeholder="Contraseña de envío" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="btn" disabled={!password || !ready} onClick={send}>Enviar {plan.assignments.length} créditos ✉️</button>
              <button className="btn ghost" onClick={reset}>Empezar de nuevo</button>
            </div>
          )}
        </section>
      )}

      {tab === "send" && stage === "sending" && (
        <section className="panel sending">
          <div className="flight">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="env" style={{ top: `${15 + i * 14}%`, animationDelay: `${i * 0.3}s` }}>{i % 2 ? "🎟️" : "✉️"}</span>
            ))}
          </div>
          <strong>Enviando {plan.assignments.length} créditos…</strong>
          <p className="note">No cierres esta pestaña.</p>
          <div className="bar"><i /></div>
        </section>
      )}

      {tab === "send" && stage === "done" && report && (
        <section className="panel">
          {sentCount > 0 && <Confetti />}
          <div className="done">
            <div className="check">{report.rows.some((r) => r.status === "failed") ? "⚠️" : "✓"}</div>
            <h2 style={{ margin: "0 0 8px" }}>{sentCount} créditos enviados</h2>
            <p className="note">El reporte se descargó automáticamente. Súbelo en “Ver reporte” cuando quieras volver a verlo.</p>
          </div>
          <ReportDashboard rows={report.rows} pendingUsers={report.pending} />
          <button className="btn ghost" onClick={reset}>Nuevo envío</button>
        </section>
      )}
    </main>
  );
}

function ColumnSelect(props: { label: string; value: number; headers: string[]; optional?: boolean; disabled?: boolean; onChange: (col: number) => void }) {
  return (
    <label className="map-field">
      <span>{props.label}</span>
      <select className="field" value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(Number(e.target.value))}>
        <option value={-1}>{props.optional ? "— Ninguno —" : "— Elige una columna —"}</option>
        {props.headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
      </select>
    </label>
  );
}
