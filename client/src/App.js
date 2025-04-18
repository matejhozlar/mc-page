import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import OnlinePlayers from "./components/OnlinePlayers";
import ServerChat from "./components/ServerChat";
import ApplyToJoin from "./components/ApplyToJoin";
import Rules from "./components/Rules.jsx";
import Home from "./components/Home.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";

function App() {
  const [showLoader, setShowLoader] = useState(() => {
    return sessionStorage.getItem("initialLoad") !== "done";
  });

  useEffect(() => {
    if (showLoader) {
      sessionStorage.setItem("initialLoad", "done");
    }
  }, [showLoader]);

  return (
    <Router>
      {showLoader ? (
        <LoadingScreen onFinish={() => setShowLoader(false)} />
      ) : (
        <div className="app-container">
          {/* Full sidebar for desktops */}
          <Sidebar />

          {/* Bottom nav for mobile */}
          <MobileNav />

          {/* Main content area */}
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/online-players" element={<OnlinePlayers />} />
              <Route path="/server-chat" element={<ServerChat />} />
              <Route path="/apply-to-join" element={<ApplyToJoin />} />
              <Route path="/rules" element={<Rules />} />
            </Routes>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
