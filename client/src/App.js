import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// components
import Sidebar from "./components/Sidebar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import OnlinePlayers from "./components/OnlinePlayers.jsx";
import ServerChat from "./components/ServerChat.jsx";
import ApplyToJoin from "./components/ApplyToJoin.jsx";
import Rules from "./components/Rules.jsx";
import Home from "./components/Home.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import FloatingHomeIcon from "./components/FloatingHomeButton.jsx";
import BlueMapViewer from "./components/BlueMap.jsx";
import AdminLoginButton from "./components/AdminLoginButton.jsx";
import Callback from "./components/Callback.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { PlayerProvider } from "./components/AdminPlayerProvider.jsx";
import ClickerGame from "./components/clickerGame/ClickerGame.jsx";
import DiscordLoginButton from "./components/DiscordLoginButton.jsx";
import CallbackGame from "./components/CallbackGame.jsx";

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
            <FloatingHomeIcon />
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/online-players" element={<OnlinePlayers />} />
              <Route path="/server-chat" element={<ServerChat />} />
              <Route path="/apply-to-join" element={<ApplyToJoin />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/blue-map" element={<BlueMapViewer />} />
              <Route path="/login-admin" element={<AdminLoginButton />} />
              <Route path="/discord-login" element={<DiscordLoginButton />} />
              <Route path="/callback" element={<Callback />} />
              <Route path="/game" element={<ClickerGame />} />
              <Route path="/callback-game" element={<CallbackGame />} />
              <Route
                path="/admin"
                element={
                  <PlayerProvider>
                    <AdminPanel />
                  </PlayerProvider>
                }
              />
            </Routes>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
