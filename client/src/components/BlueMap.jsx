import React from "react";

const BlueMapViewer = () => {
  return (
    <div
      className="bluemap-container"
      style={{ height: "100%", width: "100%" }}
    >
      <iframe
        src="http://130.61.235.242:8100/"
        title="BlueMap Viewer"
        style={{ width: "100%", height: "100%", border: "none" }}
      ></iframe>
    </div>
  );
};

export default BlueMapViewer;
