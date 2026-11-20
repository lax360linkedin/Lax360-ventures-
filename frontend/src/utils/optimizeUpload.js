// Shrinks a big PNG/JPEG photograph in the browser BEFORE it is uploaded: resized so its longer side is at most 1600 px and saved as WebP (about 5 to 10 times smaller than a camera PNG,
// transparency kept). Phone and camera photographs are often 2 to 5 MB; on the website they are shown at a few hundred pixels, so the original bytes would only slow every visitor down.
// It returns the ORIGINAL file untouched when it is small already, is not a PNG/JPEG (GIF, SVG, WebP, PDF, video), cannot be decoded, or the result would not be clearly smaller.
const MAX_EDGE = 1600
const QUALITY = 0.82
const MIN_BYTES = 200 * 1024

export async function optimizeImageFile(file) {
  try {
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size < MIN_BYTES || typeof createImageBitmap !== 'function') return file
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale)); const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
    if (!blob || blob.type !== 'image/webp' || blob.size > file.size * 0.8) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp', lastModified: Date.now() })
  } catch { return file }
}
