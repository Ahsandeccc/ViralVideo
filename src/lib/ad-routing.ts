export function shouldRenderPublicAdvertising(pathname: string): boolean {
  return !pathname.startsWith("/admin");
}
