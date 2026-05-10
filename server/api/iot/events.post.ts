// server/api/iot/events.post.ts

import { createClient } from '@supabase/supabase-js'
import { defineEventHandler } from 'h3'

type IotEventBody = {
  gateway_code: string
  sensor_code: string
  reading_type: string
  reading_value?: unknown
  reading_unit?: string
}

function readNodeBody(req: any): Promise<IotEventBody> {
  return new Promise((resolve, reject) => {
    let data = ''

    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch (err) {
        reject(err)
      }
    })

    req.on('error', reject)
  })
}

export default defineEventHandler(async (event) => {
  const headers = event.req.headers as unknown as Record<string, string | string[] | undefined>

  const rawGatewayKey = headers['x-gateway-key']

  const gatewayApiKey = Array.isArray(rawGatewayKey)
  ? rawGatewayKey[0]
  : rawGatewayKey

  if (!gatewayApiKey) {
    return {
      success: false,
      statusCode: 401,
      message: 'Missing gateway API key'
    }
  }

  const body = await readNodeBody(event.req)

  const {
    gateway_code,
    sensor_code,
    reading_type,
    reading_value,
    reading_unit
  } = body

  if (!gateway_code || !sensor_code || !reading_type) {
    return {
      success: false,
      statusCode: 400,
      message: 'Missing required IoT fields'
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  const { data: gateway, error: gatewayError } = await supabase
    .from('iot_gateway')
    .select('*')
    .eq('gateway_code', gateway_code)
    .eq('api_key', gatewayApiKey)
    .single()

  if (gatewayError || !gateway) {
    return {
      success: false,
      statusCode: 403,
      message: 'Invalid gateway key'
    }
  }

  const { data: device, error: deviceError } = await supabase
    .from('iot_device')
    .select('*')
    .eq('sensor_code', sensor_code)
    .eq('gateway_id', gateway.id)
    .single()

  if (deviceError || !device) {
    return {
      success: false,
      statusCode: 404,
      message: 'Sensor not registered under gateway'
    }
  }

  const { error: insertError } = await supabase
    .from('iot_sensor_reading')
    .insert({
      gateway_id: gateway.id,
      device_id: device.id,
      building_id: gateway.building_id,
      tenant_id: device.tenant_id ?? null,
      reading_type,
      reading_value: String(reading_value),
      reading_unit: reading_unit ?? null,
      raw_payload: body,
      processed: false
    })

  if (insertError) {
    return {
      success: false,
      statusCode: 500,
      message: insertError.message
    }
  }

  await supabase
    .from('iot_gateway')
    .update({
      last_seen_at: new Date().toISOString(),
      status: 'ACTIVE'
    })
    .eq('id', gateway.id)

  await supabase
    .from('iot_device')
    .update({
      last_seen_at: new Date().toISOString(),
      status: 'ACTIVE'
    })
    .eq('id', device.id)

  if (reading_type === 'leak_detected' && String(reading_value) === 'true') {
    const { error: rpcError } = await supabase.rpc('process_leak_readings')

    if (rpcError) {
      return {
        success: false,
        statusCode: 500,
        message: rpcError.message
      }
    }
  }

  return {
    success: true,
    message: 'IoT event received',
    gateway_code,
    sensor_code,
    reading_type,
    reading_value
  }
})