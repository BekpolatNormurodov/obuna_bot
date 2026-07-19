export function extractMovieTitle(caption: string): string {
  const lines = caption
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const labeledLine = lines.find((line) => /^film\s*nomi\s*[:\-]/i.test(line));
  if (labeledLine) {
    return labeledLine.replace(/^film\s*nomi\s*[:\-]\s*/i, '').trim();
  }

  return lines[0] ?? caption.trim();
}
