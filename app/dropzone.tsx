"use client";

import { useRef, useState } from "react";

type Props = { icon: string; title: string; hint: string; loaded?: { file: string; detail: string } | null; onFile: (file: File) => void };

export function Dropzone({ icon, title, hint, loaded, onFile }: Props) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <label
      className={`drop${over ? " over" : ""}${loaded ? " loaded" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); if (input.current) input.current.value = ""; }}
      />
      <div className="drop-inner">
        <span className="drop-icon">{loaded ? "✅" : icon}</span>
        <strong>{title}</strong>
        <span className="hint">{loaded ? <><b>{loaded.file}</b> · {loaded.detail} · cambiar</> : hint}</span>
      </div>
    </label>
  );
}
