import path from 'path'
import fs from 'fs'

const GCS_BUCKET = process.env.GCS_BUCKET

type StorageBackend = 'gcs' | 'disk'

function getBackend(): StorageBackend {
  return GCS_BUCKET ? 'gcs' : 'disk'
}

export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<string> {
  const ext = path.extname(originalFilename).toLowerCase()
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const objectPath = `${folder}/${uniqueName}`

  if (getBackend() === 'gcs') {
    const { Storage } = await import('@google-cloud/storage')
    const storage = new Storage() // Uses Application Default Credentials on Cloud Run
    const bucket = storage.bucket(GCS_BUCKET!)
    const file = bucket.file(objectPath)
    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,
    })
    return `https://storage.googleapis.com/${GCS_BUCKET}/${objectPath}`
  }

  // Disk fallback (dev/local only)
  const uploadDir = path.join(process.cwd(), folder)
  fs.mkdirSync(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, uniqueName)
  fs.writeFileSync(filePath, buffer)
  return `/${objectPath}`
}

/**
 * Generate a short-lived signed URL for a private GCS object.
 * storedUrl is the full GCS URL returned by uploadFile().
 * Falls back to returning storedUrl as-is in local/dev mode.
 */
export async function generateSignedUrl(storedUrl: string, expiresInMinutes = 15): Promise<string> {
  if (!GCS_BUCKET) {
    return storedUrl
  }

  // Extract the object path from the full GCS URL
  const prefix = `https://storage.googleapis.com/${GCS_BUCKET}/`
  const objectPath = storedUrl.startsWith(prefix)
    ? storedUrl.slice(prefix.length)
    : storedUrl

  const { Storage } = await import('@google-cloud/storage')
  const storage = new Storage()
  const file = storage.bucket(GCS_BUCKET).file(objectPath)

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    version: 'v4',
  })

  return url
}
