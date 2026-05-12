import json
import requests
import paho.mqtt.client as mqtt

# ============================================
# HAPPYTENANT IOT CONFIG
# ============================================

HAPPYTENANT_API_URL = "http://localhost:3000/api/iot/events"

IOT_GATEWAY_CODE = "ESP32-GW-001"
IOT_GATEWAY_API_KEY = "c2c64665cc3c46fa37d7aaf584c01fa66c2c88676fee749dec96d3aea1665d61"

MQTT_BROKER_HOST = "localhost"
MQTT_BROKER_PORT = 1883
MQTT_SENSOR_TOPIC = "zigbee2mqtt/#"

# ============================================
# ZIGBEE DEVICE TO BUILDING SENSOR MAPPING
# ============================================

building_sensor_registry = {
    "Bathroom Leak Sensor": {
        "sensor_code": "BLDG10001-LEAK-01",
        "sensor_type": "water_leak"
    },

    "Lobby Motion Sensor": {
        "sensor_code": "BLDG10001-MOTION-01",
        "sensor_type": "motion"
    },

    "Server Room Temperature Sensor": {
        "sensor_code": "BLDG10001-TEMP-01",
        "sensor_type": "temperature"
    }
}

# ============================================
# SENSOR VALUE EXTRACTION
# ============================================

def extract_sensor_reading(sensor_type, zigbee_payload):

    if sensor_type == "water_leak":

        if "water_leak" in zigbee_payload:
            return 1 if zigbee_payload["water_leak"] else 0

        if "leak" in zigbee_payload:
            return 1 if zigbee_payload["leak"] else 0

    elif sensor_type == "motion":

        if "occupancy" in zigbee_payload:
            return 1 if zigbee_payload["occupancy"] else 0

        if "motion" in zigbee_payload:
            return 1 if zigbee_payload["motion"] else 0

    elif sensor_type == "temperature":

        if "temperature" in zigbee_payload:
            return zigbee_payload["temperature"]

    return None

# ============================================
# SEND SENSOR EVENT TO HAPPYTENANT API
# ============================================

def submit_iot_event_to_happytenant(
    sensor_code,
    sensor_type,
    sensor_value,
    zigbee_raw_payload
):

    iot_event_payload = {
        "gateway_code": IOT_GATEWAY_CODE,
        "sensor_code": sensor_code,
        "reading_type": sensor_type,
        "reading_value": sensor_value,

        "metadata": {
            "integration_source": "zigbee2mqtt_python_gateway",
            "raw_sensor_payload": zigbee_raw_payload
        }
    }

    request_headers = {
        "Content-Type": "application/json",
        "x-gateway-key": IOT_GATEWAY_API_KEY
    }

    response = requests.post(
        HAPPYTENANT_API_URL,
        headers=request_headers,
        json=iot_event_payload,
        timeout=10
    )

    print(
        f"[HappyTenant] Sensor Event Sent | "
        f"Status: {response.status_code} | "
        f"Response: {response.text}"
    )

# ============================================
# MQTT MESSAGE HANDLER
# ============================================

def handle_zigbee_sensor_message(client, userdata, mqtt_message):

    try:

        mqtt_topic = mqtt_message.topic

        # Ignore internal Zigbee2MQTT topics
        if mqtt_topic.startswith("zigbee2mqtt/bridge"):
            return

        zigbee_device_name = mqtt_topic.replace("zigbee2mqtt/", "")

        if zigbee_device_name not in building_sensor_registry:

            print(
                f"[Warning] Unregistered Zigbee Device: "
                f"{zigbee_device_name}"
            )

            return

        zigbee_sensor_payload = json.loads(
            mqtt_message.payload.decode("utf-8")
        )

        registered_sensor = building_sensor_registry[zigbee_device_name]

        building_sensor_code = registered_sensor["sensor_code"]
        building_sensor_type = registered_sensor["sensor_type"]

        sensor_reading_value = extract_sensor_reading(
            building_sensor_type,
            zigbee_sensor_payload
        )

        if sensor_reading_value is None:

            print(
                f"[Warning] No Valid Reading | "
                f"Device: {zigbee_device_name} | "
                f"Payload: {zigbee_sensor_payload}"
            )

            return

        print(
            f"[IoT Event Detected] "
            f"{zigbee_device_name} | "
            f"Type: {building_sensor_type} | "
            f"Value: {sensor_reading_value}"
        )

        submit_iot_event_to_happytenant(
            building_sensor_code,
            building_sensor_type,
            sensor_reading_value,
            zigbee_sensor_payload
        )

    except Exception as error:

        print(f"[Error] Failed Processing Zigbee Message: {error}")

# ============================================
# MQTT CONNECTION SETUP
# ============================================

zigbee_mqtt_client = mqtt.Client()

zigbee_mqtt_client.on_message = handle_zigbee_sensor_message

zigbee_mqtt_client.connect(
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    60
)

zigbee_mqtt_client.subscribe(MQTT_SENSOR_TOPIC)

print("============================================")
print(" HappyTenant Zigbee IoT Gateway Started ")
print(" Listening For Building Sensor Events ")
print("============================================")

zigbee_mqtt_client.loop_forever()