export function safeMobileReturnPath(value: string | null): string {
  if (!value || !/^\/(?![/\\])/.test(value) || /[\r\n]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://cherryqube.invalid");
    return url.origin === "https://cherryqube.invalid" ? value : "/";
  } catch {
    return "/";
  }
}
