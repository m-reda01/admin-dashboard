function normDocField(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** @returns {"certified"|"rejected"|"uploaded"|"pending"} */
export function getDocumentListStatusKey(doc) {
  const st = normDocField(doc.status);
  const mint = normDocField(doc.mintStatus);

  const isCertified =
    mint === "succeeded" ||
    ["certified", "succeeded", "minted", "verified"].includes(st) ||
    String(doc.status ?? "") === "SUCCEEDED" ||
    String(doc.mintStatus ?? "") === "SUCCEEDED";

  if (isCertified) return "certified";

  const isRejected =
    mint === "failed" ||
    ["failed", "rejected"].includes(st) ||
    String(doc.mintStatus ?? "") === "FAILED" ||
    String(doc.status ?? "") === "FAILED";

  if (isRejected) return "rejected";

  if (["not_certified", "uploaded"].includes(st)) return "uploaded";

  return "pending";
}
