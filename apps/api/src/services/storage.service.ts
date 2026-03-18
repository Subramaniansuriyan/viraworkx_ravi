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
