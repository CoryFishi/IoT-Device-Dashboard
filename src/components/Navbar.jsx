import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-zinc-950 text-white shadow-md">
      <div className="mx-auto px-10 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Device Dashboard</h1>
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <div className={`md:flex ${open ? "block" : "hidden"}`}>
          <Link
            to="/router"
            className={`block px-4 py-2 hover:bg-zinc-700 ${
              location.pathname === "/router"
                ? "border-b-blue-800 border-b-2"
                : ""
            }`}
          >
            Routers
          </Link>
          <Link
            to="/esp32"
            className={`block px-4 py-2 hover:bg-zinc-700 ${
              location.pathname === "/esp32"
                ? "border-b-blue-800 border-b-2"
                : ""
            }`}
          >
            ESP32
          </Link>
        </div>
      </div>
    </nav>
  );
}
