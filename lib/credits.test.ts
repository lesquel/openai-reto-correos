import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCsv } from "./csv.ts";
import { assignCredits, buildCredits, detectCreditColumn, parseReport, toReportCsv, type ReportRow } from "./credits.ts";

test("detects the credit column by header, else by unique non-email content", () => {
  assert.equal(detectCreditColumn(parseCsv("id,Código de crédito\n1,ABC-1\n2,ABC-2")), 1);
  assert.equal(detectCreditColumn(parseCsv("Redemption link,used\nhttps://x/1,no")), 0);
  assert.equal(detectCreditColumn(parseCsv("a,b\n1,K1\n1,K2\n1,K3")), 1);
});

test("builds unique, trimmed credits and skips empty cells", () => {
  const table = parseCsv("code\n ABC-1 \nABC-2\n\nABC-1\n");
  assert.deepEqual(buildCredits(table, 0), ["ABC-1", "ABC-2"]);
});

test("assigns one credit per attendee in order and reports leftovers both ways", () => {
  const people = [{ name: "Ana", email: "a@x.co" }, { name: "Bob", email: "b@x.co" }, { name: "Cy", email: "c@x.co" }];
  const more = assignCredits(people, ["K1", "K2"]);
  assert.deepEqual(more.assignments, [{ name: "Ana", email: "a@x.co", credit: "K1" }, { name: "Bob", email: "b@x.co", credit: "K2" }]);
  assert.deepEqual(more.usersWithoutCredit, [{ name: "Cy", email: "c@x.co" }]);
  assert.deepEqual(assignCredits(people.slice(0, 1), ["K1", "K2"]).unusedCredits, ["K2"]);
});

test("report CSV round-trips, including free credits and commas", () => {
  const rows: ReportRow[] = [
    { credit: "K1", status: "sent", name: "López, Luis", email: "l@x.co", error: "" },
    { credit: "K2", status: "failed", name: "Ana", email: "a@x.co", error: "Resend 422" },
    { credit: "K3", status: "free", name: "", email: "", error: "" },
  ];
  assert.deepEqual(parseReport(toReportCsv(rows)), rows);
});
