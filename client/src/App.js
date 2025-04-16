import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import OnlinePlayers from "./components/OnlinePlayers.jsx";
import ServerChat from "./components/ServerChat.jsx";

const Home = () => <h1>Welcome to the Server Dashboard</h1>;

function App() {
  return (
    <Router>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />

        <div style={{ flex: 1, padding: "1rem" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/online-players" element={<OnlinePlayers />} />
            <Route path="/server-chat" element={<ServerChat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
