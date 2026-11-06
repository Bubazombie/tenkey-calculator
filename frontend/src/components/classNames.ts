/** Joins CSS Module class names, skipping missing ones. */
export function classNames(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
