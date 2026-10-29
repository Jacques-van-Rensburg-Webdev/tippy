// Hands a finished PDF to the person: on a phone or tablet the Share sheet (Save to Files, Mail,
// AirDrop, Print …); on a computer, or where sharing files isn't supported, a download.
// Call it straight from the button's click (no waiting before it): phones only open the Share
// sheet in direct response to a tap.

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// -> 'shared' | 'cancelled' | 'downloaded'
export async function sharePdf(bytes, fileName, title) {
  const file = new File([bytes], fileName, { type: 'application/pdf' });
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall back to a download.
    }
  }
  download(file, fileName);
  return 'downloaded';
}
