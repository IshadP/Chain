import { createHash } from 'crypto'

export function generateQRToken(batchId: string): string {
  const secret = process.env.QR_SIGNING_SECRET || 'default-secret'
  const timestamp = Date.now()
  const payload = `${batchId}:${timestamp}`
  
  const hash = createHash('sha256')
    .update(payload + secret)
    .digest('hex')
  
  return Buffer.from(`${payload}:${hash}`).toString('base64')
}

export function verifyQRToken(token: string, batchId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [receivedBatchId, timestamp, hash] = decoded.split(':')
    
    if (receivedBatchId !== batchId) {
      return false
    }
    
    const secret = process.env.QR_SIGNING_SECRET || 'default-secret'
    const payload = `${receivedBatchId}:${timestamp}`
    const expectedHash = createHash('sha256')
      .update(payload + secret)
      .digest('hex')
    
    return hash === expectedHash
  } catch {
    return false
  }
}