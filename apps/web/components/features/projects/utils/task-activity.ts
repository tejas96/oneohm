/** Collapse whitespace/newlines for single-line row preview. */
export function collapseCommentPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
