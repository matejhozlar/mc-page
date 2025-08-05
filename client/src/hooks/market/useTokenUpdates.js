import { useEffect } from "react";
import socket from "../../socket/socket";

export default function useTokenUpdates(setTokens) {
  useEffect(() => {
    function handleTokenUpdate(updatedToken) {
      setTokens((prevTokens) => {
        const index = prevTokens.findIndex((t) => t.id === updatedToken.id);
        if (index === -1) {
          return [...prevTokens, updatedToken];
        }

        const updated = [...prevTokens];
        updated[index] = { ...updated[index], ...updatedToken };
        return updated;
      });
    }

    socket.on("token:update", handleTokenUpdate);

    return () => {
      socket.off("token:update", handleTokenUpdate);
    };
  }, [setTokens]);
}
