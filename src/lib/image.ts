/**
 * 图片压缩（浏览器端）
 *
 * 手机拍照直传原图（3~12MB、3000~4000px）是 AI 识别慢的主因：
 * 上传慢 + base64 膨胀 33% + 千问按分辨率计 image token 推理慢。
 * 压到 200~500KB 后上传和推理双加速，学生证 OCR 精度不受影响。
 */
export const MAX_IMAGE_DIM = 1600 // 长边上限（px）
export const IMAGE_QUALITY = 0.85 // JPEG 质量

const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp']

export async function compressImage(
  file: File,
  maxDim: number = MAX_IMAGE_DIM,
  quality: number = IMAGE_QUALITY
): Promise<File> {
  // 非照片类型（GIF 动图等）原样返回，避免丢帧或转码异常
  if (!COMPRESSIBLE.includes(file.type)) return file
  // 已足够小，直接返回，省一次编解码
  if (file.size <= 300 * 1024) return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    // 尺寸已达标且本身就是 JPEG，不折腾
    if (scale === 1 && file.type === 'image/jpeg') return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // 白底：PNG 透明通道转 JPEG 时不发黑
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return file
    const name = file.name.replace(/\.\w+$/, '') || 'photo'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
