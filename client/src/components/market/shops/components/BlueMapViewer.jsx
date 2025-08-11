import { useMemo } from "react";

const DIM_TO_WORLD = {
  overworld: "world",
  nether: "world_the_nether",
  end: "world_the_end",
};

function buildBlueMapUrl(base, { dimension, x, y, z }, opts = {}) {
  const world = DIM_TO_WORLD[dimension] || DIM_TO_WORLD.overworld;

  const {
    distance = 200,
    yaw = 0,
    pitch = 0,
    roll = 0,
    tilt = 0,
    projection = "perspective",
  } = opts;

  const safeY = y ?? 64;
  const parts = [
    world,
    Number(x) || 0,
    Number(safeY) || 64,
    Number(z) || 0,
    Number(distance),
    Number(yaw),
    Number(pitch),
    Number(roll),
    Number(tilt),
    projection,
  ];

  return `${base.replace(/\/+$/, "")}/#${parts.join(":")}`;
}

const BlueMapViewer = ({
  base = "https://create-rington.com/bluemap",
  location,
  camera = {},
  style,
}) => {
  const src = useMemo(() => {
    if (!location?.dimension || location.x == null || location.z == null) {
      return base;
    }
    return buildBlueMapUrl(base, location, camera);
  }, [base, location, camera]);

  return (
    <div style={{ width: "100%", aspectRatio: "16/9", ...style }}>
      <iframe
        src={src}
        title="BlueMap Viewer"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: 8,
        }}
        loading="lazy"
      />
    </div>
  );
};

export default BlueMapViewer;
