import { useEffect, useState } from "react";

function App() {
  const [logs, setLogs] = useState([]);
  const [openLogs, setOpenLogs] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const routerRes = await fetch("http://129.146.185.61/api/uploads");
      const routerData = await routerRes.json();

      setLogs(routerData);
    };
    fetchData();
  }, []);

  const toggleLog = (index) => {
    setOpenLogs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10 space-y-8">
      {/* Logs Section */}
      <div className="w-full bg-white rounded shadow p-6">
        <h1 className="text-xl font-bold p-1">Device Logs</h1>
        {logs.length === 0 && <p className="text-gray-500">No data yet.</p>}
        {logs.map((log, index) => {
          const [uid, timestamp] = log.uid.split("_");

          const formattedDate = timestamp
            ? new Date(Number(timestamp)).toLocaleString()
            : "Unknown time";

          const isOpen = openLogs[index];

          return (
            <div key={index} className="border-t pt-4 mt-4 border-gray-200">
              <div
                className="cursor-pointer flex items-center gap-5 w-full"
                onClick={() => toggleLog(index)}
              >
                <span>{isOpen ? "▲" : "▼"}</span>
                <div>
                  <h2 className="text-lg font-semibold">
                    Device ID: {uid || "Unknown"}
                  </h2>
                  <h3> Uploaded: {formattedDate}</h3>
                </div>
              </div>
              {isOpen && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {log.files.map((file, j) => (
                    <div
                      key={j}
                      className="bg-gray-100 rounded p-3 shadow-inner"
                    >
                      <h3 className="font-semibold text-sm mb-1">
                        {file.filename}
                      </h3>
                      <pre className="text-xs whitespace-pre-wrap text-gray-700 max-h-48 overflow-auto">
                        {file.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
