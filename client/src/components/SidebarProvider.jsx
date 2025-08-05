import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import SidebarContext from "./SidebarContext";

const SidebarProvider = ({ children }) => {
  const [sidebarMode, setSidebarMode] = useState("main");
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/market")) {
      setSidebarMode("market");
    } else {
      setSidebarMode("main");
    }
  }, [location.pathname]);

  return (
    <SidebarContext.Provider value={{ sidebarMode, setSidebarMode }}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarProvider;
