import formatSshUrl from "./formatSshUrl";

export default function isValidVcsUrl(source?: string): source is string {
  if (!source?.trim()) {
    return false;
  }

  try {
    new URL(formatSshUrl(source.trim()));
    return true;
  } catch {
    return false;
  }
}
