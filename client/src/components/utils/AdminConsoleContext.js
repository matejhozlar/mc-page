import { createContext, useContext } from "react";

export const AdminConsoleContext = createContext({
  appendLog: (msg) => {},
});

export const useAdminConsole = () => useContext(AdminConsoleContext);
