"use client";

import { useMemo, useState } from "react";

import { toCsv, toReportCsv, type CreditStatus, type ReportRow } from "@/lib/credits";

import { downloadCsv, stamp } from "./download";

const STATUS: Record<CreditStatus, { label: string; icon: string }> = {
  sent: { label: "Enviados", icon: "✓" },
  failed: { label: "Fallidos", icon: "!" },
  free: { label: "Libres", icon: "○" },
};
const ORDER: CreditStatus[] = ["sent", "failed", "free"];
type Filter = CreditStatus | "all";

export function ReportDashboard({ rows, pendingUsers = [] }: { rows: ReportRow[]; pendingUsers?: { name: string; email: string }[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<CreditStatus | null>(null);

  const counts = useMemo(() => {
    const c = { sent: 0, failed: 0, free: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);
  const total = rows.length || 1;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || r.status === filter) && (!q || `${r.credit} ${r.name} ${r.email}`.toLowerCase().includes(q)));
  }, [rows, filter, query]);

  const failedUsers = rows.filter((r) => r.status === "failed").map((r) => ({ name: r.name, email: r.email }));
  const toResend = [...failedUsers, ...pendingUsers];
  const freeCredits = rows.filter((r) => r.status !== "sent").map((r) => r.credit);

  return (
    <div className="dash">
      <div className="stats">
        <div className="stat"><b>{rows.length}</b><small>créditos en total</small></div>
        {ORDER.map((s) => (
          <div className={`stat st-${s}`} key={s}>
            <b>{counts[s]}</b>
            <small><span className="st-icon">{STATUS[s].icon}</span>{STATUS[s].label.toLowerCase()} · {Math.round((counts[s] / total) * 100)}%</small>
          </div>
        ))}
      </div>

      <figure className="usage" aria-label="Uso de créditos">
        <figcaption>Uso de créditos</figcaption>
        <div className="usage-bar" role="img" aria-label={ORDER.map((s) => `${STATUS[s].label}: ${counts[s]}`).join(", ")}>
          {ORDER.filter((s) => counts[s] > 0).map((s) => (
            <span
              key={s}
              className={`seg st-${s}${hover && hover !== s ? " dim" : ""}`}
              style={{ flexGrow: counts[s] }}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setFilter(s)}
            >
              {hover === s && <span className="tip">{STATUS[s].label}: <b>{counts[s]}</b> ({Math.round((counts[s] / total) * 100)}%)</span>}
            </span>
          ))}
        </div>
        <div className="legend">
          {ORDER.map((s) => (
            <span key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}>
              <i className={`sw st-${s}`} />{STATUS[s].label} <b>{counts[s]}</b>
            </span>
          ))}
        </div>
      </figure>

      <div className="downloads">
        <button className="btn small" onClick={() => downloadCsv(`reporte-creditos-${stamp()}.csv`, toReportCsv(rows))}>⬇ Reporte completo</button>
        <button className="btn small ghost" disabled={!freeCredits.length} onClick={() => downloadCsv(`creditos-libres-${stamp()}.csv`, toCsv(["credito"], freeCredits.map((c) => [c])))}>
          ⬇ Créditos libres ({freeCredits.length})
        </button>
        <button className="btn small ghost" disabled={!toResend.length} onClick={() => downloadCsv(`usuarios-pendientes-${stamp()}.csv`, toCsv(["nombre", "email"], toResend.map((u) => [u.name, u.email])))}>
          ⬇ Usuarios pendientes ({toResend.length})
        </button>
      </div>

      <div className="table-tools">
        <div className="chips">
          {(["all", ...ORDER] as Filter[]).map((f) => (
            <button key={f} className={`chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? `Todos ${rows.length}` : `${STATUS[f].label} ${counts[f]}`}
            </button>
          ))}
        </div>
        <input className="field search" placeholder="Buscar crédito, nombre o email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="list table">
        <div className="row head"><span>Crédito</span><span>Estado</span><span>Asignado a</span></div>
        {visible.slice(0, 300).map((r) => (
          <div className="row" key={r.credit}>
            <code>{r.credit}</code>
            <span className={`tag st-${r.status}`}><span className="st-icon">{STATUS[r.status].icon}</span>{STATUS[r.status].label.slice(0, -1)}</span>
            <span className="mail" title={r.error || undefined}>{r.email ? `${r.name} · ${r.email}` : "—"}</span>
          </div>
        ))}
        {visible.length === 0 && <div className="row"><span className="mail">Sin resultados.</span></div>}
        {visible.length > 300 && <div className="row"><span className="mail">…y {visible.length - 300} más (descarga el reporte para verlos todos)</span></div>}
      </div>
    </div>
  );
}
