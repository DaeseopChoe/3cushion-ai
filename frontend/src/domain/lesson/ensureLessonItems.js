/**
 * Normalize one-point lesson list entries to { id, text } objects.
 * Kept outside AiOverlay so ADMIN AI UI can stay code-split from USER initial JS.
 */

export function ensureLessonItems(items) {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item, idx) => {
    if (typeof item === "string") {
      return {
        id: `legacy-${idx}-${item.slice(0, 40).replace(/\s/g, "_")}`,
        text: item,
      };
    }
    if (item && typeof item === "object" && item.id != null && item.text != null) {
      return item;
    }
    const t = String(item?.text ?? item ?? "");
    return { id: `fix-${idx}-${t.slice(0, 20)}`, text: t };
  });
}
