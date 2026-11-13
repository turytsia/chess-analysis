const UNSAFE_FILE_NAME_CHARACTERS = /[^a-z0-9._-]+/gi;

export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType: string
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(UNSAFE_FILE_NAME_CHARACTERS, '-');
  link.click();
  URL.revokeObjectURL(url);
}
