import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "xterm/css/xterm.css";

function RouterDump({
  logs,
  deviceRoles,
  pingStats,
  selectedStat,
  setSelectedStat,
  loading,
}) {
  const [openLogs, setOpenLogs] = useState({});
  const [openTimestamps, setOpenTimestamps] = useState({});
  const [iperfData, setIperfData] = useState({});
  const [iperfOpen, setIperfOpen] = useState(false);
  const [eventStatistics, setEventStatistics] = useState({});
  const [eventStatisticsOpen, setEventStatisticsOpen] = useState(false);

  const getIperfForUID = (uid) => {
    fetch(`http://129.146.185.61/api/iperf/${uid}`)
      .then((res) => res.json())
      .then((data) => {
        setIperfData((prev) => data);
        setIperfOpen(true);
      });
  };

  const getEventsForUID = (uid) => {
    fetch(`http://129.146.185.61/api/events/${uid}`)
      .then((res) => res.json())
      .then((data) => {
        setEventStatistics(data);
        setEventStatisticsOpen(true);
      });
  };

  const toggleUID = (uid) => {
    setOpenLogs((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  const toggleTimestamp = (uid, timestamp) => {
    setOpenTimestamps((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [timestamp]: !prev[uid]?.[timestamp],
      },
    }));
  };

  return (
    <div className="px-6 py-10 space-y-8 w-full">
      {iperfOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded shadow-lg p-6 w-11/12 max-w-3xl max-h-[80vh] overflow-auto">
            <div className="flex flex-col justify-between items-center mb-4">
              <h2 className="text-xl font-bold">iPerf Results</h2>{" "}
              {/* Chart Visualization */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={iperfData.filter((d) => d.bandwidth !== null)}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(ts) =>
                      new Date(Number(ts)).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    label={{
                      value: "Bandwidth",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value, name, props) =>
                      `${value} ${props.payload.unit || ""}`
                    }
                    labelFormatter={(label) =>
                      new Date(Number(label)).toLocaleString()
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="bandwidth"
                    stroke="#2563EB"
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="w-full flex justify-end mt-4 px-10">
                <button
                  onClick={() => setIperfOpen(false)}
                  className="bg-blue-800 hover:bg-blue-700 py-2 px-4 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {eventStatisticsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded shadow-lg p-6 w-11/12 max-w-3xl overflow-auto">
            <div className="flex flex-col justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Event Statistics</h2>
              <div className="w-full flex flex-col justify-end mt-4 px-10">
                {eventStatistics.length > 0 && (
                  <div className="w-full h-[400px]">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        "totalSmartlocks",
                        "online",
                        "offline",
                        "lowBattery",
                        "malfunction",
                        "avgRX",
                        "avgTX",
                        "avgBatteryLevel",
                        "alarms",
                        "moving",
                        "busy",
                        "totalEvents",
                      ].map((key) => (
                        <button
                          key={key}
                          className={`px-3 py-1 rounded text-sm cursor-pointer ${
                            selectedStat === key
                              ? "bg-blue-800 hover:bg-blue-900 text-white"
                              : "bg-zinc-700 hover:bg-zinc-800"
                          }`}
                          onClick={() => setSelectedStat(key)}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={eventStatistics}
                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(ts) =>
                            new Date(Number(ts)).toLocaleTimeString()
                          }
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name, props) =>
                            `${value} ${props.payload.unit || ""}`
                          }
                          labelFormatter={(label) =>
                            new Date(Number(label)).toLocaleString()
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={selectedStat}
                          stroke="#8884d8"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="w-full flex justify-end mt-4 px-10">
                  <button
                    onClick={() => setEventStatisticsOpen(false)}
                    className="bg-blue-800 hover:bg-blue-700 py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded shadow p-6">
        <h1 className="text-xl font-bold p-1">Device Logs</h1>
        {Object.keys(logs).length === 0 && loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : Object.keys(logs).length === 0 && !loading ? (
          <p className="text-zinc-500">No logs available.</p>
        ) : null}
        {Object.entries(logs).map(([uid, timestamps]) => {
          const isOpenUID = openLogs[uid];
          const latestTimestamp = Math.max(
            ...Object.keys(timestamps).map(Number)
          );
          const formattedDate = new Date(latestTimestamp).toLocaleString();

          return (
            <div key={uid} className="border-t pt-4 mt-4 border-zinc-700">
              {/* Outer UID dropdown */}
              <div
                className="cursor-pointer flex items-center gap-5 w-full justify-between"
                onClick={() => toggleUID(uid)}
              >
                <div className="flex items-center gap-5">
                  <span>{isOpenUID ? "▲" : "▼"}</span>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {uid}
                      {deviceRoles[uid] && (
                        <span className="ml-2 text-sm font-medium text-blue-800">
                          ({deviceRoles[uid]})
                        </span>
                      )}
                    </h2>
                    {pingStats[uid] && (
                      <div className="text-sm text-zinc-400">
                        Avg Ping: {pingStats[uid].avgPing} | Packet Loss:{" "}
                        {pingStats[uid].packetLoss}
                      </div>
                    )}

                    <h3>Latest Upload: {formattedDate}</h3>
                  </div>
                </div>
                {deviceRoles[uid] === "Access Point" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      getIperfForUID(uid);
                    }}
                    className="bg-blue-800 text-white px-3 py-1 rounded text-sm select-none cursor-pointer hover:bg-blue-700"
                  >
                    Show iPerf
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      getEventsForUID(uid);
                    }}
                    className="bg-blue-800 text-white px-3 py-1 rounded text-sm select-none cursor-pointer hover:bg-blue-700"
                  >
                    Show Events
                  </button>
                )}
              </div>

              {isOpenUID && (
                <div className="mt-4 space-y-6">
                  {Object.entries(timestamps)
                    .sort((a, b) => Number(b[0]) - Number(a[0]))
                    .map(([timestamp, logGroup]) => {
                      const isOpenTS =
                        openTimestamps[uid]?.[timestamp] || false;
                      const formattedTS = new Date(
                        Number(timestamp)
                      ).toLocaleString();

                      return (
                        <div
                          key={timestamp}
                          className="border-l border-l-blue-800 pl-4"
                        >
                          {/* Inner timestamp dropdown */}
                          <div
                            className="cursor-pointer flex items-center gap-3 mb-2"
                            onClick={() => toggleTimestamp(uid, timestamp)}
                          >
                            <span>{isOpenTS ? "▲" : "▼"}</span>
                            <h3 className="font-semibold">
                              Uploaded: {formattedTS}
                            </h3>
                          </div>

                          {isOpenTS && (
                            <div className="grid gap-4">
                              {logGroup.map((log, logIndex) => {
                                return (
                                  <div
                                    key={logIndex}
                                    className="grid grid-cols-2 gap-4 w-full"
                                  >
                                    {log.files.map((file, j) => (
                                      <div
                                        key={`${logIndex}-${j}`}
                                        className="bg-zinc-800 rounded p-3 shadow-inner"
                                      >
                                        <h4 className="font-semibold text-sm mb-1">
                                          {file.filename}
                                        </h4>
                                        <pre className="text-xs whitespace-pre-wrap text-zinc-200 max-h-48 overflow-auto">
                                          {file.content}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RouterDump;
