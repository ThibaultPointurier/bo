import { Transmit } from '@adonisjs/transmit-client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3333'

/**
 * Create a Transmit SSE client instance.
 * A new instance is created per usage so each subscription gets its own connection.
 */
export function createTransmit() {
  return new Transmit({
    baseUrl: API_BASE_URL.replace('/api/v1', ''),
  })
}

