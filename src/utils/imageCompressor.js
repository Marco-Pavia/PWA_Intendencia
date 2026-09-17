import imageCompression from 'browser-image-compression'
export async function convertAndCompressToWebP(imageInput, options = {}) {
  let fileToCompress = imageInput

  if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
    fileToCompress = dataURLtoFile(imageInput, `photo_${Date.now()}.png`)
  }

  const defaultOptions = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.8,
    ...options
  }

  try {
    const compressedBlob = await imageCompression(fileToCompress, defaultOptions)

    const webpFileName = (fileToCompress.name || `capture_${Date.now()}`).replace(/\.[^/.]+$/, "") + ".webp"

    const webpFile = new File([compressedBlob], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now()
    })

    console.log(`[WebP Compressor] Imagen convertida con éxito. Tamaño: ${(webpFile.size / 1024).toFixed(1)} KB`)
    return webpFile
  } catch (error) {
    console.warn('[WebP Compressor] Error usando browser-image-compression, usando fallback de Canvas API:', error)
    return await convertToWebPViaCanvas(fileToCompress)
  }
}
async function convertToWebPViaCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const maxDim = 1200

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Falló la conversión a Blob WebP en Canvas.'))
            return
          }
          const fileName = (file.name || `photo_${Date.now()}`).replace(/\.[^/.]+$/, "") + ".webp"
          const webpFile = new File([blob], fileName, {
            type: 'image/webp',
            lastModified: Date.now()
          })
          resolve(webpFile)
        },
        'image/webp',
        0.8
      )
    }
    img.onerror = (err) => reject(err)
    img.src = url
  })
}
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}
