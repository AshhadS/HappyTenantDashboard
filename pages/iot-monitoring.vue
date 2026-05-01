<template>
  <main class="iot-page">
    <div class="page-shell">
      <Card class="iot-hero">
        <template #content>
          <div class="iot-hero__top">
            <div>
              <Tag value="IoT Monitoring" icon="pi pi-wifi" severity="warning" rounded />
              <h1>Sensor Monitoring</h1>
              <p>Auto-detected issues, sensor evidence, and live maintenance trust signals.</p>
            </div>
            <Button label="Refresh" icon="pi pi-refresh" :loading="loading" severity="info" @click="loadIotData" />
          </div>

          <div class="iot-stat-grid">
            <div v-for="card in overviewCards" :key="card.label" class="iot-stat-card">
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </div>
          </div>
        </template>
      </Card>

      <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

      <Card class="section-card">
        <template #title>IoT Incidents</template>
        <template #content>
          <DataTable v-if="incidents.length" :value="incidents" size="small" paginator :rows="8" stripedRows rowHover>
            <Column field="incident_type" header="Incident">
              <template #body="{ data }">{{ formatIncidentType(data.incident_type) }}</template>
            </Column>
            <Column field="severity" header="Severity">
              <template #body="{ data }"><Tag :value="data.severity || '--'" severity="warning" rounded /></template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }"><Tag :value="data.status || '--'" :severity="incidentStatusSeverity(data.status)" rounded /></template>
            </Column>
            <Column header="Sensor">
              <template #body="{ data }">{{ data.iot_device?.device_name || data.iot_device?.sensor_code || '--' }}</template>
            </Column>
            <Column header="Location">
              <template #body="{ data }">{{ data.iot_device?.location_label || data.iot_gateway?.location_label || '--' }}</template>
            </Column>
            <Column field="building_id" header="Building" />
            <Column field="started_at" header="Started">
              <template #body="{ data }">{{ formatDate(data.started_at) }}</template>
            </Column>
            <Column header="Linked Ticket">
              <template #body="{ data }">{{ data.linked_ticket_id || '--' }}</template>
            </Column>
          </DataTable>
          <Message v-else severity="info" :closable="false">No IoT incidents yet.</Message>
        </template>
      </Card>

      <Card class="section-card">
        <template #title>Sensors</template>
        <template #content>
          <DataTable v-if="devices.length" :value="devices" size="small" paginator :rows="8" stripedRows rowHover>
            <Column field="device_name" header="Sensor" />
            <Column field="device_type" header="Type">
              <template #body="{ data }">{{ formatDeviceType(data.device_type) }}</template>
            </Column>
            <Column field="building_id" header="Building" />
            <Column field="location_label" header="Location" />
            <Column header="Gateway">
              <template #body="{ data }">{{ data.iot_gateway?.gateway_code || '--' }}</template>
            </Column>
            <Column field="status" header="Status">
              <template #body="{ data }"><Tag :value="formatDeviceStatus(data.status)" :severity="deviceStatusSeverity(data.status)" rounded /></template>
            </Column>
            <Column field="last_seen_at" header="Last Seen">
              <template #body="{ data }">{{ formatDate(data.last_seen_at) }}</template>
            </Column>
            <Column field="pin_number" header="Pin">
              <template #body="{ data }">{{ data.pin_number ?? '--' }}</template>
            </Column>
          </DataTable>
          <Message v-else severity="info" :closable="false">No sensors registered yet.</Message>
        </template>
      </Card>

      <Card v-if="isDevelopment" class="section-card">
        <template #title>Developer Emulator</template>
        <template #content>
          <div class="emulator-panel">
            <label for="emulatorDevice">Select sensor</label>
            <select id="emulatorDevice" v-model="selectedDeviceId">
              <option value="" disabled>Select IoT device</option>
              <option v-for="device in emulatorCandidates" :key="device.id" :value="device.id">
                {{ device.device_name || device.sensor_code || device.id }} ({{ device.building_id || '--' }})
              </option>
            </select>
            <Button
              label="Emulate Leak Event"
              icon="pi pi-tint"
              severity="danger"
              :loading="emulatorLoading"
              :disabled="!selectedDeviceId || emulatorLoading"
              @click="handleEmulateLeak"
            />
          </div>
        </template>
      </Card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { IotDevice, IotIncident } from '~/types/iotMaintenance'
import { SUPABASE_ACCESS_TOKEN_KEY, SUPABASE_USER_ID_KEY, SUPABASE_USER_ROLE_KEY } from '~/composables/useSupabaseAuth'
import { useIotMaintenance } from '~/composables/useIotMaintenance'

const role = ref('')
const token = ref('')
const userId = ref('')
const loading = ref(false)
const emulatorLoading = ref(false)
const errorMessage = ref('')
const devices = ref<IotDevice[]>([])
const incidents = ref<IotIncident[]>([])
const selectedDeviceId = ref('')
const overview = ref({
  activeSensorAlerts: 0,
  totalSensors: 0,
  offlineSensors: 0,
  autoDetectedTickets: 0,
  sensorVerifiedRepairs: 0,
  openIotIncidents: 0
})

const { fetchDevices, fetchIncidents, fetchOverview, emulateLeakEvent } = useIotMaintenance()
const isDevelopment = computed(() => import.meta.dev)
const isLandlord = computed(() => role.value === 'LANDLORD')
const scopedUserId = computed(() => (isLandlord.value ? userId.value : undefined))

const overviewCards = computed(() => [
  { label: 'Active Sensor Alerts', value: overview.value.activeSensorAlerts },
  { label: 'Total Sensors', value: overview.value.totalSensors },
  { label: 'Offline Sensors', value: overview.value.offlineSensors },
  { label: 'Auto-detected Tickets', value: overview.value.autoDetectedTickets },
  { label: 'Sensor-verified Repairs', value: overview.value.sensorVerifiedRepairs },
  { label: 'Open IoT Incidents', value: overview.value.openIotIncidents }
])

const emulatorCandidates = computed(() => devices.value.filter((item) => (item.device_type || '').toUpperCase() === 'WATER_LEAK'))

const formatDate = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const formatDeviceType = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
}

const formatDeviceStatus = (value?: string | null) => {
  if ((value || '').toUpperCase() === 'OFFLINE') {
    return 'Device offline'
  }

  return value || '--'
}

const formatIncidentType = (value?: string | null) => {
  if (!value) {
    return '--'
  }

  if (value.toUpperCase() === 'WATER_LEAK_DETECTED') {
    return 'Water leak detected'
  }

  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase())
}

const incidentStatusSeverity = (value?: string | null) => {
  const status = (value || '').toUpperCase()
  if (status === 'OPEN') return 'danger'
  if (status === 'LINKED_TO_TICKET') return 'warning'
  if (status === 'RESOLVED') return 'success'
  return 'secondary'
}

const deviceStatusSeverity = (value?: string | null) => ((value || '').toUpperCase() === 'OFFLINE' ? 'danger' : 'success')

const loadIotData = async () => {
  if (!token.value) {
    errorMessage.value = 'You are not signed in.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  const [overviewResult, deviceResult, incidentResult] = await Promise.all([
    fetchOverview(token.value, scopedUserId.value),
    fetchDevices(token.value, scopedUserId.value),
    fetchIncidents(token.value, scopedUserId.value)
  ])

  if (overviewResult.error || deviceResult.error || incidentResult.error) {
    errorMessage.value = overviewResult.error || deviceResult.error || incidentResult.error || 'Unable to load IoT monitoring.'
    loading.value = false
    return
  }

  overview.value = overviewResult.data || overview.value
  devices.value = deviceResult.data
  incidents.value = incidentResult.data

  if (!selectedDeviceId.value && emulatorCandidates.value.length) {
    selectedDeviceId.value = emulatorCandidates.value[0].id
  }

  loading.value = false
}

const handleEmulateLeak = async () => {
  const selected = emulatorCandidates.value.find((item) => item.id === selectedDeviceId.value)
  if (!selected || !token.value) {
    return
  }

  emulatorLoading.value = true
  const result = await emulateLeakEvent(token.value, {
    device_id: selected.id,
    gateway_id: selected.gateway_id || '',
    building_id: selected.building_id || ''
  })

  if (result.error) {
    errorMessage.value = result.error
    emulatorLoading.value = false
    return
  }

  await loadIotData()
  emulatorLoading.value = false
}

onMounted(async () => {
  if (!process.client) {
    return
  }

  token.value = localStorage.getItem(SUPABASE_ACCESS_TOKEN_KEY) || ''
  role.value = localStorage.getItem(SUPABASE_USER_ROLE_KEY) || ''
  userId.value = localStorage.getItem(SUPABASE_USER_ID_KEY) || ''
  await loadIotData()
})
</script>

<style scoped>
.iot-page {
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
  background: var(--color-soft-linen-300);
  display: flex;
  justify-content: center;
}

.page-shell {
  width: min(1200px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.iot-hero :deep(.p-card-body) {
  border-radius: 1.2rem;
  background: var(--color-carbon-black-900);
  color: var(--color-soft-linen-50);
  padding: 1.2rem;
}

.iot-hero__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.iot-hero h1 {
  margin: 0.4rem 0 0.2rem;
}

.iot-hero p {
  margin: 0;
  color: rgba(243, 244, 241, 0.85);
}

.iot-stat-grid {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.6rem;
}

.iot-stat-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.8rem;
  padding: 0.7rem 0.8rem;
  background: rgba(255, 255, 255, 0.08);
}

.iot-stat-card span {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
}

.iot-stat-card strong {
  font-size: 1.35rem;
}

.section-card :deep(.p-card-body) {
  border-radius: 1rem;
  padding: 1rem;
}

.emulator-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
}

.emulator-panel label {
  font-weight: 600;
  color: var(--color-carbon-black-700);
}

.emulator-panel select {
  min-width: 260px;
  border: 1px solid var(--color-soft-linen-200);
  border-radius: 0.65rem;
  padding: 0.45rem 0.6rem;
  background: #fff;
}
</style>
