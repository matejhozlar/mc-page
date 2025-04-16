import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import OnlinePlayers from "./components/OnlinePlayers";
import ServerChat from "./components/ServerChat";
import ApplyToJoin from "./components/ApplyToJoin";

const Home = () => <h1>Welcome to the Server Dashboard</h1>;

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Full sidebar for desktops */}
        <Sidebar />

        {/* The bottom nav for mobile */}
        <MobileNav />

        {/* Main content area */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/online-players" element={<OnlinePlayers />} />
            <Route path="/server-chat" element={<ServerChat />} />
            <Route path="/apply-to-join" element={<ApplyToJoin />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
