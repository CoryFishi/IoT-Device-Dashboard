import { useEffect, useState } from "react";
import mqtt from "mqtt";
import toast from "react-hot-toast";

const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL;
const options = {
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
  connectTimeout: 4000,
};

function RelayBoard() {
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [mqttLogs, setMqttLogs] = useState([]);
  const [knownUids, setKnownUids] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch("http://129.146.185.61/api/mqtt/logs");
      const data = await res.json();
      setMqttLogs(data);
    };

    const fetchUids = async () => {
      const res = await fetch("http://129.146.185.61/api/mqtt/uids");
      const data = await res.json();
      setKnownUids(data);

      // Initialize status with relay states from knownUids
      setStatus(() => {
        const initialStatus = {};
        for (const uid in data) {
          initialStatus[uid] = {
            1: data[uid].relay1,
            2: data[uid].relay2,
            3: data[uid].relay3,
            4: data[uid].relay4,
          };
        }
        console.log("Initial Status:", initialStatus);
        return initialStatus;
      });
    };

    fetchLogs();
    fetchUids();
  }, []);

  useEffect(() => {
    const mqttClient = mqtt.connect(brokerUrl, options);
    setClient(mqttClient);

    mqttClient.on("connect", () => {
      console.log("✅ Connected to MQTT broker");
      setIsConnected(true);
      mqttClient.subscribe(`status/#`);
    });

    mqttClient.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.uid && payload.model) {
          setStatus((prev) => ({
            ...prev,
            [payload.uid]: {
              1: payload.relay1,
              2: payload.relay2,
              3: payload.relay3,
              4: payload.relay4,
            },
          }));
        } else if (payload.topic && payload.msg) {
          const relay = payload.topic.split("/").pop();
          setStatus((prev) => ({ ...prev, [relay]: payload.msg }));
        }
      } catch (err) {
        console.error("❌ Failed to parse message", err);
      }
    });

    return () => {
      mqttClient.end();
    };
  }, []);

  return (
    <div className="p-6 font-sans">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xl font-bold mb-2">
          <h2>ESP32 Relay Control</h2>
          <h2>{isConnected ? "🟢" : "🔴"}MQTT Connection</h2>
        </div>
        {Object.keys(knownUids).map((uid, index) => (
          <div className="flex flex-col" key={index}>
            <h2 className="text-xl font-bold mb-2">UID: {uid}</h2>
            <div className="flex flex-col gap-2">
              <h2>Mqtt Communication</h2>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((relay) => (
                  <div
                    key={relay}
                    className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded shadow"
                  >
                    <span className="font-medium">Relay {relay}:</span>
                    <button
                      onClick={() => {
                        client.publish(
                          `devices/${uid}/relay/${relay}`,
                          "on",
                          {},
                          (err) => {
                            if (err) {
                              toast.error(
                                `${uid} failed to publish to relay ${relay}`
                              );
                            } else {
                              toast.success(
                                `Published ${uid} relay toggle ${relay} ON`
                              );
                            }
                          }
                        );
                      }}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded cursor-pointer"
                    >
                      Turn ON
                    </button>
                    <button
                      onClick={() => {
                        client.publish(
                          `devices/${uid}/relay/${relay}`,
                          "off",
                          {},
                          (err) => {
                            if (err) {
                              toast.error(
                                `${uid} failed to publish to relay ${relay}`
                              );
                            } else {
                              toast.success(
                                `Published ${uid} relay toggle ${relay} OFF`
                              );
                            }
                          }
                        );
                      }}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded cursor-pointer"
                    >
                      Turn OFF
                    </button>
                    <span className="ml-auto text-sm text-zinc-400 font-bold">
                      Status:{" "}
                      <span
                        className={
                          (status[uid]?.[relay] ||
                            knownUids[uid]?.[`relay${relay}`]) === "on"
                            ? "text-green-600"
                            : (status[uid]?.[relay] ||
                                knownUids[uid]?.[`relay${relay}`]) === "off"
                            ? "text-red-600"
                            : "text-zinc-500"
                        }
                      >
                        {status[uid]?.[relay] ||
                          knownUids[uid]?.[`relay${relay}`] ||
                          "unknown"}
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded shadow">
                  <span className="font-medium">All Relays:</span>
                  <button
                    onClick={() => {
                      client.publish(`devices/${uid}/relay/1`, "on");
                      client.publish(`devices/${uid}/relay/2`, "on");
                      client.publish(`devices/${uid}/relay/3`, "on");
                      client.publish(`devices/${uid}/relay/4`, "on");
                    }}
                    className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white rounded cursor-pointer"
                  >
                    Turn ON
                  </button>
                  <button
                    onClick={() => {
                      client.publish(`devices/${uid}/relay/1`, "off");
                      client.publish(`devices/${uid}/relay/2`, "off");
                      client.publish(`devices/${uid}/relay/3`, "off");
                      client.publish(`devices/${uid}/relay/4`, "off");
                    }}
                    className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer"
                  >
                    Turn OFF
                  </button>
                </div>
              </div>
              <h2>API Communication</h2>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((relay) => (
                  <div
                    key={relay}
                    className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded shadow"
                  >
                    <span className="font-medium">Relay {relay}:</span>
                    <button
                      onClick={() => {
                        toast.promise(
                          (async () => {
                            const res = await fetch(
                              `http://129.146.185.61/api/mqtt/${uid}/relay/${relay}/on`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              }
                            );

                            if (!res.ok) {
                              const data = await res.json();
                              throw new Error(data.message || "Request failed");
                            }

                            return res.json();
                          })(),
                          {
                            loading: "Sending request...",
                            success: (
                              <b>
                                {uid} relay {relay} toggled on!
                              </b>
                            ),
                            error: (
                              <b>
                                Could not toggle {uid} relay {relay} on...
                              </b>
                            ),
                          }
                        );
                      }}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded cursor-pointer"
                    >
                      Turn ON
                    </button>
                    <button
                      onClick={() => {
                        toast.promise(
                          (async () => {
                            const res = await fetch(
                              `http://129.146.185.61/api/mqtt/${uid}/relay/${relay}/off`,
                              {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                              }
                            );

                            if (!res.ok) {
                              const data = await res.json();
                              throw new Error(data.message || "Request failed");
                            }

                            return res.json();
                          })(),
                          {
                            loading: "Sending request...",
                            success: (
                              <b>
                                {uid} relay {relay} toggled off!
                              </b>
                            ),
                            error: (
                              <b>
                                Could not toggle {uid} relay {relay} off...
                              </b>
                            ),
                          }
                        );
                      }}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded cursor-pointer"
                    >
                      Turn OFF
                    </button>
                    <span className="ml-auto text-sm text-zinc-400 font-bold">
                      Status:{" "}
                      <span
                        className={
                          (status[uid]?.[relay] ||
                            knownUids[uid]?.[`relay${relay}`]) === "on"
                            ? "text-green-600"
                            : (status[uid]?.[relay] ||
                                knownUids[uid]?.[`relay${relay}`]) === "off"
                            ? "text-red-600"
                            : "text-zinc-500"
                        }
                      >
                        {status[uid]?.[relay] ||
                          knownUids[uid]?.[`relay${relay}`] ||
                          "unknown"}
                      </span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded shadow">
                  <span className="font-medium">All Relays:</span>
                  <button
                    onClick={() => {
                      toast.promise(
                        (async () => {
                          const res = await fetch(
                            `http://129.146.185.61/api/mqtt/${uid}/relay/all/on`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                            }
                          );

                          if (!res.ok) {
                            const data = await res.json();
                            throw new Error(data.message || "Request failed");
                          }

                          return res.json();
                        })(),
                        {
                          loading: "Sending request...",
                          success: <b>{uid} all relays toggled on!</b>,
                          error: <b>Could not toggle {uid} all relays on...</b>,
                        }
                      );
                    }}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded cursor-pointer"
                  >
                    Turn ON
                  </button>
                  <button
                    onClick={() => {
                      toast.promise(
                        (async () => {
                          const res = await fetch(
                            `http://129.146.185.61/api/mqtt/${uid}/relay/all/off`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                            }
                          );

                          if (!res.ok) {
                            const data = await res.json();
                            throw new Error(data.message || "Request failed");
                          }

                          return res.json();
                        })(),
                        {
                          loading: "Sending request...",
                          success: <b>{uid} all relays toggled off!</b>,
                          error: (
                            <b>Could not toggle {uid} all relays off...</b>
                          ),
                        }
                      );
                    }}
                    className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer"
                  >
                    Turn OFF
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Recent MQTT Logs</h3>
        <div className="overflow-auto bg-zinc-900 border border-zinc-800 p-2 rounded max-h-44">
          {mqttLogs.map((log, i) => (
            <div key={i} className="text-sm py-1">
              <strong>{log.timestamp}</strong> —{" "}
              <span className="text-blue-600">{log.topic}</span> ={" "}
              <span onClick={() => console.log(log)}>
                {JSON.stringify(log.payload)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RelayBoard;
