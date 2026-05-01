export interface IotGateway {
  id: string
  gateway_code: string | null
  building_id: string | null
  location_label: string | null
  status: string | null
  last_seen_at: string | null
  created_at: string | null
}

export interface IotDevice {
  id: string
  gateway_id: string | null
  sensor_code: string | null
  building_id: string | null
  device_name: string | null
  device_type: string | null
  location_label: string | null
  pin_number: number | null
  status: string | null
  last_seen_at: string | null
  created_at: string | null
  iot_gateway?: IotGateway | null
}

export interface IotIncident {
  id: string
  building_id: string | null
  gateway_id: string | null
  device_id: string | null
  incident_type: string | null
  severity: string | null
  status: string | null
  confidence_score: number | null
  linked_ticket_id: string | null
  started_at: string | null
  ended_at: string | null
  iot_device?: IotDevice | null
  iot_gateway?: IotGateway | null
}

export interface TicketVerificationEvent {
  id: string
  ticket_id: string
  device_id: string | null
  verification_type: string | null
  verification_status: string | null
  evidence_summary: string | null
  evidence_data: Record<string, unknown> | null
  confidence_score: number | null
  verified_at: string | null
  created_at: string | null
  iot_device?: IotDevice | null
}

export interface IotOverview {
  activeSensorAlerts: number
  totalSensors: number
  offlineSensors: number
  autoDetectedTickets: number
  sensorVerifiedRepairs: number
  openIotIncidents: number
}

export interface TicketSensorEvidencePayload {
  incident: IotIncident | null
  verificationEvents: TicketVerificationEvent[]
}
