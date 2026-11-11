import assert from "node:assert/strict";
import test from "node:test";
import {
  clientFileName,
  isSafeClientFilePath,
  parseClientFilePath,
  renamedClientFilePath,
  sanitizeClientFileName,
} from "@/lib/commissions/client-files";

const UID = "6f1c2a1e-0000-4000-8000-000000000001";
const REQ = "9a2b3c4d-0000-4000-8000-000000000002";

test("parses reference and delivery paths", () => {
  assert.deepEqual(parseClientFilePath(`${UID}/refs/1700000000000-ab12c-sketch.png`), {
    clientId: UID,
    kind: "reference",
    requestId: null,
    folder: `${UID}/refs`,
    file: "1700000000000-ab12c-sketch.png",
  });
  const delivery = parseClientFilePath(`${UID}/deliveries/${REQ}/1700000000000-ab12c-final.psd`);
  assert.equal(delivery.kind, "delivery");
  assert.equal(delivery.requestId, REQ);
  assert.equal(parseClientFilePath(`${UID}/misc.png`).kind, "other");
});

test("display name drops the unique prefix", () => {
  assert.equal(clientFileName(`${UID}/refs/1700000000000-ab12c-sketch.png`), "sketch.png");
  assert.equal(clientFileName(`${UID}/refs/plain.png`), "plain.png");
});

test("rename keeps folder and unique prefix", () => {
  assert.equal(
    renamedClientFilePath(`${UID}/refs/1700000000000-ab12c-sketch.png`, "Pose ref (front).png"),
    `${UID}/refs/1700000000000-ab12c-Pose-ref-front-.png`,
  );
  assert.equal(
    renamedClientFilePath(`${UID}/deliveries/${REQ}/plain.png`, "final.png"),
    `${UID}/deliveries/${REQ}/final.png`,
  );
});

test("rename rejects no-ops and unusable names", () => {
  assert.equal(renamedClientFilePath(`${UID}/refs/1700000000000-ab12c-a.png`, "a.png"), null);
  assert.equal(renamedClientFilePath(`${UID}/refs/a.png`, "   "), null);
  assert.equal(renamedClientFilePath(`${UID}/refs/a.png`, "../../x.png"), `${UID}/refs/x.png`);
  assert.equal(sanitizeClientFileName("a/b\\c.png"), "a-b-c.png");
});

test("path guard", () => {
  assert.ok(isSafeClientFilePath(`${UID}/refs/a.png`));
  for (const bad of ["", "/abs.png", `${UID}/../x.png`, `${UID}//a.png`, `${UID}/./a.png`]) {
    assert.equal(isSafeClientFilePath(bad), false, bad);
  }
});
