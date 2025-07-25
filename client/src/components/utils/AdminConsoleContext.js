import { createContext, useContext } from "react";

export const AdminConsoleContext = createContext({
  appendLog: () => {},
});

export const useAdminConsole = () => useContext(AdminConsoleContext);
