// Shared by ReviewsSection (review photos) and EditCafeTaxonomy (cafe
// photo/logo) — both attach an image by embedding it as a data: URL
// directly in the row (photo_url / image_url), the same pattern, so the
// read-the-file-into-a-string step is the same too.
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
