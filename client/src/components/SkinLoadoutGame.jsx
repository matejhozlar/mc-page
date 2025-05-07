// SkinLoadoutGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { SkinViewer } from "skinview3d";
import html2canvas from "html2canvas";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const SkinLoadoutGame = () => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [skinUrl] = useState("https://mc-heads.net/skin/saunhardy");
  const [loadoutName, setLoadoutName] = useState("");
  const [capeUrl, setCapeUrl] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 300,
      height: 400,
      skin: skinUrl,
    });

    viewer.controls.enableZoom = false;

    viewerRef.current = viewer;

    // Try enabling the idle animation
    const tryEnableIdle = () => {
      if (viewer.animations && typeof viewer.animations.idle === "function") {
        viewer.animation = viewer.animations.idle();
      } else {
        // Retry after a short delay in case it wasn't ready
        setTimeout(tryEnableIdle, 100);
      }
    };

    tryEnableIdle();

    return () => viewer.dispose();
  }, [skinUrl]);

  useEffect(() => {
    if (viewerRef.current && capeUrl) {
      viewerRef.current.loadCape(capeUrl);
    }
  }, [capeUrl]);

  const addPickaxeModel = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const existingTool = viewer.playerObject.getObjectByName("tool");
    if (existingTool) {
      viewer.playerObject.remove(existingTool);
    }

    const loader = new GLTFLoader();
    loader.load("/models/minecraft_pickaxe.glb", (gltf) => {
      const model = gltf.scene;
      model.name = "tool";
      model.scale.set(0.5, 0.5, 0.5);
      model.position.set(-1, -8, 0);
      model.rotation.set(0, -Math.PI / 2, -Math.PI / 8);
      const rightArm = viewer.playerObject.getObjectByName("rightArm");
      if (rightArm) {
        rightArm.add(model);
      }
    });
  };

  const removeTool = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const existingTool = viewer.playerObject.getObjectByName("tool");
    if (existingTool) {
      viewer.playerObject.remove(existingTool);
    }
  };

  let isAnimating = false;

  const triggerAttackAnimation = () => {
    const viewer = viewerRef.current;
    if (!viewer || isAnimating) return;

    const arm = viewer.playerObject.getObjectByName("rightArm");
    if (!arm) return;

    isAnimating = true;

    const initialRotation = arm.rotation.x;
    let progress = 0;
    const duration = 300;
    const swingAmount = -Math.PI / 2;
    const startTime = performance.now();

    const animate = (time) => {
      progress = (time - startTime) / duration;
      if (progress < 1) {
        const swing = swingAmount * Math.sin(progress * Math.PI);
        arm.rotation.x = initialRotation + swing;
        requestAnimationFrame(animate);
      } else {
        arm.rotation.x = initialRotation;
        isAnimating = false;
      }
    };

    requestAnimationFrame(animate);
  };

  const handleDownload = () => {
    const card = document.getElementById("character-card");
    html2canvas(card).then((canvas) => {
      const link = document.createElement("a");
      link.download = `${loadoutName || "my-loadout"}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  return (
    <div id="character-card" style={{ textAlign: "center", padding: 20 }}>
      <h2>Skin Loadout Builder</h2>
      <input
        type="text"
        placeholder="Enter Loadout Name"
        value={loadoutName}
        onChange={(e) => setLoadoutName(e.target.value)}
      />
      <br />
      <br />
      <canvas ref={canvasRef} style={{ border: "1px solid #ccc" }} />
      <br />
      <button
        onClick={() =>
          setCapeUrl(
            "https://textures.minecraft.net/texture/3a1bd3e7f8cbd1d10f5f2a3b9a86f3b7b579e4e5f5c0d07ec2e8e0703e1a"
          )
        }
      >
        Add Cape
      </button>
      <button onClick={() => setCapeUrl(null)}>Remove Cape</button>
      <br />
      <button onClick={addPickaxeModel}>Add Pickaxe</button>
      <button onClick={removeTool}>Remove Tool</button>
      <button onClick={triggerAttackAnimation}>Attack</button>
      <br />
      <br />
      <button onClick={handleDownload}>Download Loadout Card</button>
    </div>
  );
};

export default SkinLoadoutGame;
