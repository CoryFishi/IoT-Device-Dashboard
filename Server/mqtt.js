import mqtt from "mqtt";
import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "mqtt_logs.json");
const UID_STORE = path.join(process.cwd(), "device_uids.json");
const pendingAcks = new Map();

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

const knownUIDs = fs.existsSync(UID_STORE)
  ? JSON.parse(fs.readFileSync(UID_STORE, "utf-8"))
  : {};

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("status/+");
  client.subscribe("request/+/state");
});

client.on("message", (topic, message) => {
  const payloadStr = message.toString("utf-8");
  const requestMatch = topic.match(/^request\/(.+)\/state$/);

  console.log(`Incoming topic: ${topic}, payload: ${payloadStr}`);

  if (requestMatch) {
    const uid = requestMatch[1];

    if (knownUIDs[uid]) {
      const responseTopic = `${uid}/state`;
      const statePayload = JSON.stringify({
        uid,
        model: knownUIDs[uid].model,
        relay1: knownUIDs[uid].relay1,
        relay2: knownUIDs[uid].relay2,
        relay3: knownUIDs[uid].relay3,
        relay4: knownUIDs[uid].relay4,
      });

      client.publish(responseTopic, statePayload);
      console.log(`Sent state to ${responseTopic}: ${statePayload}`);
    } else {
      console.warn(`No saved state found for UID ${uid}`);
    }

    return;
  }

  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch (err) {
    console.error("Failed to parse JSON payload:", payloadStr);
    return;
  }

  const uid = payload.uid;
  if (!uid) return;

  knownUIDs[uid] = {
    model: payload.model || "Relay",
    relay1: payload.relay1 || "off",
    relay2: payload.relay2 || "off",
    relay3: payload.relay3 || "off",
    relay4: payload.relay4 || "off",
  };

  fs.writeFileSync(UID_STORE, JSON.stringify(knownUIDs, null, 2));

  const entry = {
    uid,
    topic,
    timestamp: new Date().toISOString(),
    payload,
  };

  let logs = [];
  if (fs.existsSync(LOG_PATH)) {
    logs = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
  }
  logs.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs.slice(-1000), null, 2));
});

client.on("message", (topic, message) => {
  const payloadStr = message.toString("utf-8");

  const statusMatch = topic.match(/^status\/(.+)$/);
  if (statusMatch) {
    const uid = statusMatch[1];
    console.log(uid);
    if (pendingAcks.has(uid)) {
      console.log("resolved");
      pendingAcks.get(uid)(payloadStr); // resolve with raw payload
      pendingAcks.delete(uid);
    }
  }
});

export { client as mqttClient, pendingAcks };
