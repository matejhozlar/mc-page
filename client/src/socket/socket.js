import { io } from "socket.io-client";
const socket = io({ withCredentials: true });
export default socket;
