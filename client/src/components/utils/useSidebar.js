import { useContext } from "react";
import SidebarContext from "../SidebarContext.jsx";

const useSidebar = () => useContext(SidebarContext);
export default useSidebar;
