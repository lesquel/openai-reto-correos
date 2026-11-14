import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAttendees, detectColumns, parseCsv } from "./csv.ts";

const detect = (csv: string) => {
  const table = parseCsv(csv);
  return { table, mapping: detectColumns(table) };
};

test("detects email and name under many header spellings", () => {
  const cases: [string, number, number[]][] = [
    ["Nombre,Correo electrónico\nAna,ana@x.com", 1, [0]],
    ["Correo participante;Nombre del participante\nana@x.com;Ana", 0, [1]],
    ["Marca temporal,Dirección de correo electrónico,Nombre completo\n1,ana@x.com,Ana P", 1, [2]],
    ["E-mail,Full Name\nana@x.com,Ana", 0, [1]],
    ["Nombre del equipo,Nombre participante,Mail\nLos Bots,Ana,ana@x.com", 2, [1]],
  ];
  for (const [csv, email, name] of cases) {
    const { mapping } = detect(csv);
    assert.equal(mapping.email, email, csv);
    assert.deepEqual(mapping.name, name, csv);
  }
});

test("combines first and last name columns when there is no full name", () => {
  const { table, mapping } = detect("First Name,Last Name,Email\nAna,Pérez,ana@x.com");
  assert.deepEqual(mapping.name, [0, 1]);
  assert.deepEqual(buildAttendees(table, mapping).attendees, [{ name: "Ana Pérez", email: "ana@x.com" }]);
});

test("finds the email column by its content when the header is unhelpful", () => {
  const { mapping } = detect("col1,col2\nAna,ana@x.com\nBob,bob@y.com");
  assert.equal(mapping.email, 1);
});

test("returns -1 when no column looks like an email", () => {
  assert.equal(detect("name,phone\nAna,123").mapping.email, -1);
});

test("builds attendees: quotes, semicolons, BOM, CRLF, 'Name <mail>' cells, dedupe, invalid rows", () => {
  const csv = '﻿nombre;correo\r\n"López; Luis";LUIS@Y.COM\r\nAna;Ana <ana@x.com>\r\nAna2;ana@x.com\r\nBob;no-mail\r\n;sinnombre@z.com\r\n';
  const { table, mapping } = detect(csv);
  const result = buildAttendees(table, mapping);
  assert.deepEqual(result.attendees, [
    { name: "López; Luis", email: "luis@y.com" },
    { name: "Ana", email: "ana@x.com" },
    { name: "sinnombre", email: "sinnombre@z.com" },
  ]);
  assert.deepEqual(result.invalid, [4]);
  assert.equal(result.duplicates, 1);
});
