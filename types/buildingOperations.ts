import type { IotDevice, IotGateway, IotIncident, TicketVerificationEvent } from '~/types/iotMaintenance'

export interface BuildingOperationsSummary {
  buildingId: string
  buildingName: string
  isOnline: boolean
  openTicketsCount: number
  activeIncidentsCount: number
  activeSensorCount: number
  offlineDeviceCount: number
  lastActivityAt: string | null
}

export interface BuildingOperationsTicket {
  id: string
  title: string
  description: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  source: string | null
  linkedIotIncidentId: string | null
  verificationStatus: string | null
  tenantName: string | null
  unitNumber: string | null
  assignedWatchman: string | null
  linkedSensorName: string | null
  sensorLocation: string | null
  severity: string | null
}

export interface BuildingOperationsSensor extends IotDevice {
  gatewayName: string | null
}

export interface BuildingOperationsGateway extends IotGateway {
  sensorsAttached: number
}

export interface BuildingActivityItem {
  id: string
  type: 'incident' | 'ticket' | 'sensor' | 'gateway' | 'verification'
  title: string
  detail: string
  timestamp: string | null
  severity: 'normal' | 'warning' | 'critical' | 'success'
}

export interface DeviceHealthPanel {
  offlineSensors: BuildingOperationsSensor[]
  offlineGateways: BuildingOperationsGateway[]
  unlinkedIncidentsCount: number
  pendingVerificationCount: number
}

export interface BuildingOperationsHubData {
  buildingId: string
  buildingName: string
  summary: BuildingOperationsSummary
  gateways: BuildingOperationsGateway[]
  sensors: BuildingOperationsSensor[]
  incidents: IotIncident[]
  tickets: BuildingOperationsTicket[]
  activityFeed: BuildingActivityItem[]
  healthPanel: DeviceHealthPanel
  verificationEvents: TicketVerificationEvent[]
}
