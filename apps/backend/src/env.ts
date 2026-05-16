import 'dotenv/config'
import { z } from 'zod'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultDataRoot = path.resolve(__dirname, '../../../data')
if (!process.env.GBRAIN_DATA_ROOT) process.env.GBRAIN_DATA_ROOT = defaultDataRoot

const envSchema = z.object({
  VAPI_API_KEY: z.string().optional().default(''),
  VAPI_SECRET: z.string().optional().default(''),
  VAPI_ASSISTANT_ID: z.string().optional(),
  VAPI_PHONE_NUMBER_ID: z.string().optional(),

  GBRAIN_API_KEY: z.string().optional().default(''),
  GBRAIN_BASE_URL: z.string().optional().default(''),
  GBRAIN_PROJECT_ID: z.string().optional().default(''),

  GSTACK_API_KEY: z.string().optional().default(''),
  GSTACK_BASE_URL: z.string().optional().default(''),
  GSTACK_PROJECT_ID: z.string().optional().default(''),

  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DEMO_PHONE: z.string().default('+1XXXXXXXXXX'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
