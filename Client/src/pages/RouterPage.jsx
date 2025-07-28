import { useEffect, useState } from "react";
import RouterDump from "../components/router/RouterDump";
import Navbar from "../components/Navbar";

export default function RouterPage() {
  const [eventData, setEventData] = useState([]);
  const [selectedStat, setSelectedStat] = useState("totalSmartlocks");
  const [logs, setLogs] = useState({});
  const [deviceRoles, setDeviceRoles] = useState({});
  const [pingStats, setPingStats] = useState({});
  const [loading, setLoading] = useState(true);

  const parsePingLog = (content) => {
    const lossMatch = content.match(/(\d+)% packet loss/);
    const avgMatch = content.match(
      /round-trip min\/avg\/max = [\d.]+\/([\d.]+)\/[\d.]+ ms/
    );

    const packetLoss = lossMatch ? `${lossMatch[1]}%` : "N/A";
    const avgPing = avgMatch ? `${avgMatch[1]} ms` : "N/A";

    return { packetLoss, avgPing };
  };

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("http://129.146.185.61/api/uploads");
      const data = await res.json();
      const grouped = {};
      const roles = {};
      const pingStats = {};

      for (const log of data) {
        const [uid, timestamp] = [log.uid, log.timestamp];
        if (!grouped[uid]) grouped[uid] = {};
        if (!grouped[uid][timestamp]) grouped[uid][timestamp] = [];
        grouped[uid][timestamp].push(log);
      }

      for (const uid of Object.keys(grouped)) {
        const timestamps = Object.keys(grouped[uid]);
        const latestTimestamp = Math.max(...timestamps.map(Number));
        const latestLogs = grouped[uid][latestTimestamp];

        let role = null;
        let pingLogContent = null;

        for (const log of latestLogs) {
          for (const file of log.files) {
            if (file.filename.includes("events_statistics.txt"))
              role = "Edge Router";
            if (file.filename.includes("iperf_results.txt"))
              role = "Access Point";
            if (file.filename === "ping_log.txt") pingLogContent = file.content;
          }
        }

        roles[uid] = role;

        if (pingLogContent) {
          const { avgPing, packetLoss } = parsePingLog(pingLogContent);
          pingStats[uid] = { avgPing, packetLoss };
        }
      }
      setLogs(grouped);
      setDeviceRoles(roles);
      setPingStats(pingStats);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="max-h-screen min-h-screen overflow-y-auto bg-zinc-900 text-white">
      <Navbar />
      <RouterDump
        logs={logs}
        deviceRoles={deviceRoles}
        pingStats={pingStats}
        selectedStat={selectedStat}
        setSelectedStat={setSelectedStat}
        loading={loading}
      />
    </div>
  );
}
