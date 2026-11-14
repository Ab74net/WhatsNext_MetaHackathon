export function normalizePathname(path: string) { return path.replace(/\/+$/, "") || "/"; }
export function isActiveNavigation(pathname: string, hash: string, href: string) {
  const path = normalizePathname(pathname);
  const [target, targetHash] = href.split("#");
  const route = normalizePathname(target);
  if (targetHash) return path === route && hash === `#${targetHash}`;
  if (route === "/") return path === "/" && !hash;
  return (path === route || path.startsWith(`${route}/`)) && !(path === "/claims" && hash === "#memory");
}
