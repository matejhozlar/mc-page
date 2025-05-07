import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { SkinViewer } from "skinview3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ClickerGame = () => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const stoneBaseRef = useRef(null);
  const stoneOverlayRef = useRef(null);
  const destroyTextures = useRef([]);
  const isAnimatingRef = useRef(false);
  const breakStageRef = useRef(0);
  const skinUrl = "https://mc-heads.net/skin/saunhardy";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // initialize viewer
    const viewer = new SkinViewer({
      canvas,
      width: 600,
      height: 600,
      skin: skinUrl,
    });

    // ── [ NEW ] disable toneMapping + output in sRGB so our pickaxe isn't dark ──
    viewer.renderer.toneMapping = THREE.NoToneMapping;
    viewer.renderer.outputEncoding = THREE.sRGBEncoding;

    viewer.camera.position.set(0, 10, 100);
    viewer.controls.enableZoom = false;
    viewer.controls.enableRotate = false;
    viewerRef.current = viewer;
    viewer.playerObject.rotation.y = Math.PI / 2;

    // idle anim
    const tryEnableIdle = () => {
      if (viewer.animations?.idle) {
        viewer.animation = viewer.animations.idle();
      } else {
        setTimeout(tryEnableIdle, 100);
      }
    };
    tryEnableIdle();

    // load break-overlay textures
    const textureLoader = new THREE.TextureLoader();
    for (let i = 0; i <= 9; i++) {
      destroyTextures.current[i] = textureLoader.load(
        `/assets/clickerGame/destroy/destroy_stage_${i}.png`
      );
    }

    // load stone block + overlay
    textureLoader.load(
      "/assets/clickerGame/textures/stone.png",
      (stoneTexture) => {
        const geometry = new THREE.BoxGeometry(10, 10, 1);
        const stoneMaterial = new THREE.MeshBasicMaterial({
          map: stoneTexture,
        });
        const stoneMesh = new THREE.Mesh(geometry, stoneMaterial);
        stoneMesh.position.set(12, -12, 0);
        stoneMesh.name = "stoneBlock";
        viewer.scene.add(stoneMesh);
        stoneBaseRef.current = stoneMesh;

        const overlayMaterial = new THREE.MeshBasicMaterial({
          map: null,
          transparent: true,
          opacity: 0,
          depthTest: false,
        });
        const overlayMesh = new THREE.Mesh(geometry, overlayMaterial);
        overlayMesh.position.set(12, -12, 0.01);
        overlayMesh.name = "stoneOverlay";
        viewer.scene.add(overlayMesh);
        stoneOverlayRef.current = overlayMesh;
      }
    );

    // Auto-attach pickaxe once viewer is ready
    const loader = new GLTFLoader();
    loader.load(
      "/assets/clickerGame/models/wooden_pickaxe.glb",
      (gltf) => {
        const model = gltf.scene;
        model.name = "tool";
        model.scale.set(1, 1, 1);
        model.position.set(-1, -12, 3);
        model.rotation.y = Math.PI;
        model.rotation.x = Math.PI / 6;

        // ── [ UPDATED ] mark sRGB + nearest for each map ──
        model.traverse((child) => {
          if (child.isMesh && child.material.map) {
            const oldMap = child.material.map;
            // decode as sRGB (gamma) so it stays bright
            oldMap.encoding = THREE.sRGBEncoding;
            oldMap.needsUpdate = true;
            // nearest‐neighbor so pixels don’t blur/darken
            oldMap.magFilter = THREE.NearestFilter;
            oldMap.minFilter = THREE.NearestFilter;
            oldMap.generateMipmaps = false;

            child.material.dispose();
            child.material = new THREE.MeshBasicMaterial({
              map: oldMap,
              transparent: true,
            });
          }
        });

        const rightArm = viewer.playerObject.getObjectByName("rightArm");
        if (rightArm) rightArm.add(model);
      },
      undefined,
      (error) => console.error("GLB failed to load", error)
    );

    // hit animation
    const triggerHitAnimation = () => {
      if (!viewer || isAnimatingRef.current) return;
      const arm = viewer.playerObject.getObjectByName("rightArm");
      if (!arm) return;

      isAnimatingRef.current = true;
      const originalRotation = arm.rotation.x;
      const swingAmount = -Math.PI / 3;
      const duration = 300;
      const startTime = performance.now();

      const animate = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const swing = swingAmount * Math.sin(progress * Math.PI);
        arm.rotation.x = originalRotation + swing;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          arm.rotation.x = originalRotation;
          isAnimatingRef.current = false;
        }
      };

      requestAnimationFrame(animate);
    };

    // stone breaking overlay
    const breakStone = () => {
      const overlay = stoneOverlayRef.current;
      const stage = breakStageRef.current;
      if (!overlay || destroyTextures.current.length < 10) return;

      if (stage <= 9) {
        overlay.material.map = destroyTextures.current[stage];
        overlay.material.opacity = 1;
        overlay.material.needsUpdate = true;
        breakStageRef.current += 1;
      }

      if (stage === 9) {
        setTimeout(() => {
          overlay.material.map = null;
          overlay.material.opacity = 0;
          overlay.material.needsUpdate = true;
          breakStageRef.current = 0;
        }, 200);
      }
    };

    // clicking logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, viewer.camera);
      const intersects = raycaster.intersectObjects(
        viewer.scene.children,
        true
      );
      for (const intersect of intersects) {
        const obj = intersect.object;
        if (obj.name === "stoneBlock" || obj.name === "stoneOverlay") {
          triggerHitAnimation();
          breakStone();
          break;
        }
      }
    };

    canvas.addEventListener("click", onClick);
    return () => {
      viewer.dispose();
      canvas.removeEventListener("click", onClick);
    };
  }, [skinUrl]);

  return (
    <div id="character-card" style={{ textAlign: "center", padding: 20 }}>
      <h2>Tool Viewer</h2>
      <canvas ref={canvasRef} style={{ border: "1px solid #ccc" }} />
    </div>
  );
};

export default ClickerGame;
