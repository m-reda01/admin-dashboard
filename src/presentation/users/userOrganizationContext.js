export function userOrganizationLinkId(user) {
  const rawOrgId = user?.orgId;
  if (rawOrgId !== null && rawOrgId !== undefined && rawOrgId !== "") {
    if (typeof rawOrgId === "object") {
      const id = rawOrgId?.id ?? rawOrgId?.orgId ?? rawOrgId?.organizationId ?? "";
      const out = String(id).trim();
      if (out) return out;
    } else {
      const s = String(rawOrgId).trim();
      if (s && s !== "[object Object]") return s;
    }
  }

  const ao = user?.activeOrg;
  if (ao === null || ao === undefined || ao === "") return "";
  if (typeof ao === "string") return ao.trim();
  if (typeof ao === "object") {
    const id = ao.id ?? ao.orgId ?? ao.organizationId ?? "";
    return String(id).trim();
  }
  const fallback = String(ao).trim();
  return fallback && fallback !== "[object Object]" ? fallback : "";
}

export function isOrganizationScopedRole(role) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return (
    normalizedRole === "org_member" ||
    normalizedRole === "org_owner" ||
    normalizedRole === "owner" ||
    normalizedRole === "organization_owner"
  );
}

export function isOrganizationUserAccount(user) {
  return Boolean(userOrganizationLinkId(user)) && isOrganizationScopedRole(user.role);
}
