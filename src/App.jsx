import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import RouterPage from "./pages/RouterPage";
import ESP32Page from "./pages/ESP32Page";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" reverseOrder={false} />
      <Routes>
        <Route path="/router" element={<RouterPage />} />
        <Route path="/esp32" element={<ESP32Page />} />
        <Route path="/*" element={<RouterPage />} />
      </Routes>
    </Router>
  );
}

export default App;
