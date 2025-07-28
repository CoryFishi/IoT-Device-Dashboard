import Navbar from "../components/Navbar";
import RelayBoard from "../components/esp32/RelayBoard";

export default function ESP32Page() {
  return (
    <div className="max-h-screen min-h-screen overflow-y-auto bg-zinc-900 text-white">
      <Navbar />
      <RelayBoard />
    </div>
  );
}
