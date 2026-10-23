// Store the source File unchanged; display names and preview files are separate.
export function originalUploadMetadata(file) {
  return {
    contentType: file.type || 'application/octet-stream',
    customMetadata: { originalFileName: file.name, originalLastModified: String(file.lastModified || 0) }
  };
}
export async function downloadOriginal(url, name) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error('The original file could not be downloaded. Please try again.');
  const blob = await response.blob();
  const localURL = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = localURL; link.download = name || 'download';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(localURL), 60000);
}
