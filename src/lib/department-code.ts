const CODE_LENGTH = 3;

/** Lowercase letters/digits only, accents stripped ("Diseño" -> "diseno"). */
function slug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** The un-numbered code for a name: its first 3 letters ("dep" if it has none). */
export function departmentCodeBase(name: string) {
  return slug(name).slice(0, CODE_LENGTH) || "dep";
}

/**
 * Picks a unique department code from the name: the first 3 letters, then
 * with a number appended (`des`, `des2`, `des3`, ...) if that's taken.
 */
export function generateDepartmentCode(
  name: string,
  existingCodes: Iterable<string>,
) {
  const taken = new Set(existingCodes);
  const base = departmentCodeBase(name);

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}
