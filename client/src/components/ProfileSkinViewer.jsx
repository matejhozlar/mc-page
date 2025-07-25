import React, { useEffect, useRef } from "react";
import { SkinViewer } from "skinview3d";

const ProfileSkinViewer = ({ username }) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 300,
      height: 400,
      skin: `https://mc-heads.net/skin/${username}`,
    });

    viewerRef.current = viewer;
    viewer.camera.position.set(20, 10, 50);
    viewer.controls.enableZoom = false;
    viewer.controls.enableRotate = true;

    const startAnimations = () => {
      try {
        if (viewer.animations?.walking) {
          viewer.animation = viewer.animations.walking();
        }
      } catch (e) {
        console.warn("Animation setup failed:", e);
      }
    };

    requestAnimationFrame(startAnimations);

    return () => {
      viewer.dispose();
    };
  }, [username]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "8px", backgroundColor: "#111" }}
    />
  );
};

export default ProfileSkinViewer;
