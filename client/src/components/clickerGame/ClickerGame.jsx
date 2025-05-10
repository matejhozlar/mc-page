import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";
import { SkinViewer } from "skinview3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import styles from "./css/clickerGame.module.css";

const ClickerGame = () => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const stoneBaseRef = useRef(null);
  const stoneOverlayRef = useRef(null);
  const destroyTextures = useRef([]);
  const isAnimatingRef = useRef(false);
  const breakStageRef = useRef(0);
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [skinUrl, setSkinUrl] = useState(null);
  const [points, setPoints] = useState(0);
  const [tool, setTool] = useState("hand");
  const [pickaxeModel] = useState(null);
  const [inventory, setInventory] = useState(["hand"]);
  const [materials, setMaterials] = useState({});
  const [lastDrop, setLastDrop] = useState(null);
  const [autoClickLevel, setAutoClickLevel] = useState(0);
  const isUserClickingRef = useRef(false);
  const [autoclickerReady, setAutoclickerReady] = useState(false);
  const [autoclickerFullyReady, setAutoclickerFullyReady] = useState(false);

  const toolCosts = {
    wooden: 100,
    stone: 500,
    copper: 2500,
    iron: 10000,
    gold: 50000,
    diamond: 200000,
    netherite: 1000000,
  };

  const autoClickerUpgrades = useMemo(
    () => [
      { rate: 0.5, cost: { cobble_stone: 200, copper_ingot: 1 } },
      { rate: 1.0, cost: { cobble_stone: 500, copper_ingot: 3 } },
      { rate: 2.0, cost: { cobble_stone: 1000, iron_ingot: 10 } },
      { rate: 3.5, cost: { cobble_stone: 2000, gold_ingot: 5 } },
      { rate: 5.0, cost: { cobble_stone: 5000, diamond: 2 } },
      { rate: 7.5, cost: { cobble_stone: 10000, netherite_ingot: 1 } },
    ],
    []
  );

  const toolMaterialCosts = {
    stone: { cobble_stone: 100 },
    copper: { cobble_stone: 200, copper_ingot: 25 },
    iron: { cobble_stone: 300, copper_ingot: 40, iron_ingot: 25 },
    gold: {
      cobble_stone: 500,
      copper_ingot: 75,
      iron_ingot: 50,
      gold_ingot: 20,
    },
    diamond: {
      cobble_stone: 700,
      copper_ingot: 100,
      iron_ingot: 75,
      gold_ingot: 50,
      diamond: 10,
    },
    netherite: {
      cobble_stone: 1000,
      copper_ingot: 150,
      iron_ingot: 100,
      gold_ingot: 75,
      diamond: 25,
      netherite_ingot: 5,
    },
  };

  const materialDrops = useMemo(
    () => ({
      wooden: [{ name: "cobble_stone", chance: 1 }],
      stone: [
        { name: "cobble_stone", chance: 0.99 },
        { name: "copper_ingot", chance: 0.01 },
      ],
      copper: [
        { name: "cobble_stone", chance: 0.975 },
        { name: "copper_ingot", chance: 0.015 },
        { name: "iron_ingot", chance: 0.01 },
      ],
      iron: [
        { name: "cobble_stone", chance: 0.95 },
        { name: "copper_ingot", chance: 0.02 },
        { name: "iron_ingot", chance: 0.015 },
        { name: "gold_ingot", chance: 0.01 },
      ],
      gold: [
        { name: "cobble_stone", chance: 0.92 },
        { name: "copper_ingot", chance: 0.03 },
        { name: "iron_ingot", chance: 0.02 },
        { name: "gold_ingot", chance: 0.02 },
        { name: "diamond", chance: 0.01 },
      ],
      diamond: [
        { name: "cobble_stone", chance: 0.88 },
        { name: "copper_ingot", chance: 0.035 },
        { name: "iron_ingot", chance: 0.03 },
        { name: "gold_ingot", chance: 0.03 },
        { name: "diamond", chance: 0.02 },
        { name: "netherite_ingot", chance: 0.005 },
      ],
      netherite: [
        { name: "cobble_stone", chance: 0.85 },
        { name: "copper_ingot", chance: 0.04 },
        { name: "iron_ingot", chance: 0.035 },
        { name: "gold_ingot", chance: 0.035 },
        { name: "diamond", chance: 0.025 },
        { name: "netherite_ingot", chance: 0.01 },
      ],
    }),
    []
  );

  const materialNames = {
    cobble_stone: "Cobblestone",
    copper_ingot: "Copper Ingot",
    iron_ingot: "Iron Ingot",
    gold_ingot: "Gold Ingot",
    diamond: "Diamond",
    netherite_ingot: "Netherite Ingot",
  };

  useEffect(() => {
    fetch("/api/user/validate", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) setAllowed(true);
        else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.name) setUser(data);
        else {
          localStorage.clear();
          window.location.href = "/";
        }
      })
      .catch(() => {
        localStorage.clear();
        window.location.href = "/";
      });
  }, [allowed]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/game-data", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setPoints(data.points);
        setTool(data.tool);
        setInventory(data.inventory);
        setMaterials(data.materials);
        setAutoClickLevel(data.auto_click_level);
        console.log(data.auto_click_level);
      })
      .catch((err) => console.error("Failed to fetch game data", err));
  }, [user]);

  useEffect(() => {
    if (user?.name) {
      setSkinUrl(`https://mc-heads.net/skin/${user.name}`);
    }
  }, [user]);

  useEffect(() => {
    const checkReady = () => {
      const overlayReady = !!stoneOverlayRef.current;
      const viewerReady = !!viewerRef.current;
      const texturesReady =
        destroyTextures.current.filter(Boolean).length === 10;

      if (overlayReady && viewerReady && texturesReady && autoClickLevel > 0) {
        setAutoclickerFullyReady(true);
      } else {
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  }, [autoClickLevel]);

  useEffect(() => {
    if (!autoclickerFullyReady) return;
    if (autoClickLevel === 0) return;
    if (
      !stoneOverlayRef.current ||
      destroyTextures.current.length < 10 ||
      !autoclickerReady
    )
      return;

    const rate = autoClickerUpgrades[autoClickLevel - 1].rate;
    let localStage = 0;

    const interval = setInterval(() => {
      const overlay = stoneOverlayRef.current;
      const viewer = viewerRef.current;

      if (!overlay || !viewer) return;

      const valuePerClick = {
        hand: 0.5,
        wooden: 1,
        stone: 2,
        copper: 4,
        iron: 8,
        gold: 16,
        diamond: 32,
        netherite: 64,
      };

      if (isUserClickingRef.current) {
        const earned = valuePerClick[tool] || 0;
        setPoints((prev) => prev + earned);
        return;
      }

      const arm = viewer.playerObject.getObjectByName("rightArm");
      if (arm && !isAnimatingRef.current) {
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
      }

      if (localStage <= 9) {
        overlay.material.map = destroyTextures.current[localStage];
        overlay.material.opacity = 1;
        overlay.material.needsUpdate = true;
        localStage += 1;

        const earned = valuePerClick[tool] || 0;
        setPoints((prev) => prev + earned);
      }

      if (localStage === 10) {
        overlay.material.map = null;
        overlay.material.opacity = 0;
        overlay.material.needsUpdate = true;
        localStage = 0;

        // Drop material
        const drops = materialDrops[tool] || [];
        const rand = Math.random();
        let cumulative = 0;
        for (const drop of drops) {
          cumulative += drop.chance;
          if (rand <= cumulative) {
            setMaterials((prev) => ({
              ...prev,
              [drop.name]: (prev[drop.name] || 0) + 1,
            }));

            setLastDrop((prev) => {
              if (prev?.name === drop.name) {
                clearTimeout(prev.timeoutId);
                const newTimeoutId = setTimeout(() => setLastDrop(null), 2500);
                return {
                  ...prev,
                  count: prev.count + 1,
                  timeoutId: newTimeoutId,
                };
              } else {
                const newTimeoutId = setTimeout(() => setLastDrop(null), 2500);
                return { name: drop.name, count: 1, timeoutId: newTimeoutId };
              }
            });
            break;
          }
        }
      }
    }, 1000 / rate);

    return () => clearInterval(interval);
  }, [
    autoClickLevel,
    tool,
    autoClickerUpgrades,
    materialDrops,
    autoclickerReady,
    autoclickerFullyReady,
  ]);

  const nextUpgrade = autoClickerUpgrades[autoClickLevel];

  const handleAutoclickerUpgrade = () => {
    const cost = nextUpgrade?.cost || {};
    const hasEnough = Object.entries(cost).every(
      ([mat, amt]) => (materials[mat] || 0) >= amt
    );
    if (!hasEnough) return;

    setMaterials((prev) => {
      const updated = { ...prev };
      for (const [mat, amt] of Object.entries(cost)) {
        updated[mat] -= amt;
      }
      return updated;
    });

    const newLevel = autoClickLevel + 1;
    setAutoClickLevel(newLevel);

    saveProgress({
      points,
      tool,
      inventory,
      materials: Object.fromEntries(
        Object.entries(materials).map(([k, v]) => [k, v - (cost[k] || 0)])
      ),
      auto_click_level: newLevel,
    });
  };

  useEffect(() => {
    if (!viewerRef.current || tool === "hand") return;

    const loader = new GLTFLoader();
    const url = `/assets/clickerGame/models/brightened/${tool}_pickaxe_bright.glb`;

    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.name = "tool";
        model.scale.set(1, 1, 1);
        model.position.set(-1, -12, 3);
        model.rotation.y = Math.PI;
        model.rotation.x = Math.PI / 6;

        model.traverse((child) => {
          if (child.isMesh && child.material.map) {
            const map = child.material.map;
            map.encoding = THREE.sRGBEncoding;
            map.needsUpdate = true;
            map.magFilter = THREE.NearestFilter;
            map.minFilter = THREE.NearestFilter;
            map.generateMipmaps = false;

            child.material.dispose();
            child.material = new THREE.MeshBasicMaterial({
              map,
              transparent: true,
            });
          }
        });

        const rightArm =
          viewerRef.current.playerObject.getObjectByName("rightArm");
        if (rightArm) {
          // Remove previous pickaxe model manually
          const old = rightArm.children.find((child) => child.name === "tool");
          if (old) {
            rightArm.remove(old);
          }

          rightArm.add(model);
          // No need to update React state — it causes rerender + flicker
          pickaxeModel &&
            pickaxeModel.traverse((obj) => {
              if (typeof obj.dispose === "function") {
                obj.dispose();
              }
            });
        }
      },
      undefined,
      (err) => console.error(`Failed to load ${tool} pickaxe`, err)
    );
  }, [tool, pickaxeModel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skinUrl) return;

    const viewer = new SkinViewer({
      canvas,
      width: 300,
      height: 300,
      skin: skinUrl,
    });
    viewer.renderer.toneMapping = THREE.NoToneMapping;
    viewer.renderer.outputEncoding = THREE.sRGBEncoding;
    viewer.camera.position.set(20, 10, 50);
    viewer.controls.target.set(5, 0, 0);
    viewer.controls.enableZoom = false;
    viewer.controls.enableRotate = false;
    viewerRef.current = viewer;
    viewer.playerObject.rotation.y = Math.PI / 2;

    const tryEnableIdle = () => {
      if (viewer.animations?.idle) {
        viewer.animation = viewer.animations.idle();
      } else {
        setTimeout(tryEnableIdle, 100);
      }
    };
    tryEnableIdle();

    const textureLoader = new THREE.TextureLoader();
    for (let i = 0; i <= 9; i++) {
      const tex = textureLoader.load(
        `/assets/clickerGame/destroy/destroy_stage_${i}.png`,
        () => {
          if (destroyTextures.current.filter(Boolean).length === 10) {
            setAutoclickerReady(true);
          }
        }
      );
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      destroyTextures.current[i] = tex;
    }

    textureLoader.load("/assets/clickerGame/textures/stone.png", (texture) => {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      const stoneMaterials = Array(6).fill(
        new THREE.MeshBasicMaterial({ map: texture })
      );

      const stoneGeometry = new THREE.BoxGeometry(10, 10, 10);
      const stoneMesh = new THREE.Mesh(stoneGeometry, stoneMaterials);
      stoneMesh.position.set(10.5, -12, 0);

      stoneMesh.name = "stoneBlock";
      viewer.scene.add(stoneMesh);
      stoneBaseRef.current = stoneMesh;

      // Create overlay block slightly larger
      const overlayMaterial = new THREE.MeshBasicMaterial({
        map: null,
        transparent: true,
        opacity: 0,
        depthTest: false,
      });

      const overlayMesh = new THREE.Mesh(
        stoneGeometry.clone(),
        overlayMaterial
      );
      overlayMesh.scale.multiplyScalar(1.01);
      overlayMesh.position.set(10.5, -12, 0.01);
      overlayMesh.name = "stoneOverlay";

      viewer.scene.add(overlayMesh);
      stoneOverlayRef.current = overlayMesh;
    });

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

    const breakStone = () => {
      const overlay = stoneOverlayRef.current;
      const stage = breakStageRef.current;
      if (!overlay || destroyTextures.current.length < 10) return;

      const tryDropMaterial = () => {
        const drops = materialDrops[tool] || [];
        const rand = Math.random();
        let cumulative = 0;
        for (const drop of drops) {
          cumulative += drop.chance;
          if (rand <= cumulative) {
            setMaterials((prev) => ({
              ...prev,
              [drop.name]: (prev[drop.name] || 0) + 1,
            }));

            setLastDrop((prev) => {
              if (prev?.name === drop.name) {
                clearTimeout(prev.timeoutId);
                const newTimeoutId = setTimeout(() => setLastDrop(null), 2500);
                return {
                  ...prev,
                  count: prev.count + 1,
                  timeoutId: newTimeoutId,
                };
              } else {
                const newTimeoutId = setTimeout(() => setLastDrop(null), 2500);
                return { name: drop.name, count: 1, timeoutId: newTimeoutId };
              }
            });
            break;
          }
        }
      };

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

          // Drop item now that block resets
          tryDropMaterial();
        }, 200);
      }
    };

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
          isUserClickingRef.current = true;
          setTimeout(() => {
            isUserClickingRef.current = false;
          }, 150);
          triggerHitAnimation();
          breakStone();

          let earned = 0;
          if (tool === "hand") {
            if (Math.random() < 0.5) earned = 1;
          } else {
            const values = {
              wooden: 1,
              stone: 2,
              copper: 4,
              iron: 8,
              gold: 16,
              diamond: 32,
              netherite: 64,
            };
            earned = values[tool] || 0;
          }

          if (earned > 0) setPoints((prev) => prev + earned);
          break;
        }
      }
    };

    canvas.addEventListener("click", onClick);
    return () => {
      viewer.dispose();
      canvas.removeEventListener("click", onClick);
    };
  }, [skinUrl, tool, materialDrops]);

  const handleUpgrade = (newTool) => {
    const cost = toolCosts[newTool];
    const materialCost = toolMaterialCosts[newTool] || {};
    const toolOrder = Object.keys(toolCosts);
    const currentTier = toolOrder.indexOf(tool);
    const newTier = toolOrder.indexOf(newTool);

    const hasEnoughMaterials = Object.entries(materialCost).every(
      ([mat, amt]) => (materials[mat] || 0) >= amt
    );

    if (points >= cost && newTier > currentTier && hasEnoughMaterials) {
      setMaterials((prev) => {
        const updated = { ...prev };
        for (const [mat, amt] of Object.entries(materialCost)) {
          updated[mat] -= amt;
        }
        return updated;
      });

      setPoints((prev) => prev - cost);
      setTool(newTool);
      setInventory((prev) => [...prev, newTool]);
    } else {
      console.warn("Insufficient materials or points.");
    }
  };

  useEffect(() => {
    if (!lastDrop) return;

    const timeout = setTimeout(() => {
      setLastDrop(null);
    }, 2500);

    return () => clearTimeout(timeout);
  }, [lastDrop]);

  const toolOrder = Object.keys(toolCosts);

  const shop = toolOrder
    .filter((name) => !inventory.includes(name))
    .map((name, index) => {
      const cost = toolCosts[name];
      const materialCost = toolMaterialCosts[name] || {};
      const toolIndex = toolOrder.indexOf(name);
      const currentTier = toolOrder.indexOf(tool);
      const unlocked = toolIndex <= currentTier + 1;
      const filename = name === "gold" ? "golden" : name;

      return (
        <button
          key={name}
          disabled={!unlocked || points < cost}
          onClick={() => unlocked && handleUpgrade(name)}
          className={styles.shopItem}
        >
          <div className={styles.pickaxeWrapper}>
            <img
              src={`/assets/clickerGame/models/images/${filename}_pick.png`}
              alt={`${name} pickaxe`}
              className={styles.pickaxeIcon}
            />
            {!unlocked && (
              <img
                src="/assets/clickerGame/models/images/lock_locked.png"
                alt="Locked"
                className={styles.lockCentered}
              />
            )}
          </div>
          <div className={styles.itemPrice}>
            {unlocked ? `${cost} pts` : `????`}
          </div>
          {unlocked && Object.keys(materialCost).length > 0 && (
            <div className={styles.materialCostList}>
              {Object.entries(materialCost).map(([mat, amt]) => {
                const current = materials[mat] || 0;
                const insufficient = current < amt;

                return (
                  <div key={mat} className={styles.materialCost}>
                    <img
                      src={`/assets/clickerGame/materials/${mat}.png`}
                      alt={mat}
                      className={styles.materialIcon}
                    />
                    <span
                      className={
                        insufficient
                          ? styles.materialCountInsufficient
                          : styles.materialCount
                      }
                    >
                      {current} / {amt}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </button>
      );
    });

  useEffect(() => {
    return () => {
      if (lastDrop?.timeoutId) {
        clearTimeout(lastDrop.timeoutId);
      }
    };
  }, [lastDrop]);

  const saveTimeoutRef = useRef(null);

  const saveProgress = useCallback(
    (override = null) => {
      if (!user) return;

      const payload = override || {
        points,
        tool,
        inventory,
        materials,
        auto_click_level: autoClickLevel ?? 0,
      };

      fetch("/api/game-data", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("Failed to save progress", err);
      });
    },
    [user, points, tool, inventory, materials, autoClickLevel]
  );

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveProgress, 2000);
  }, [saveProgress]);

  useEffect(() => {
    scheduleSave();
  }, [points, tool, inventory, materials, autoClickLevel, scheduleSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [points, tool, inventory, materials, autoClickLevel, saveProgress]);

  if (!checked || (allowed && !user)) {
    return (
      <div className="admin-panel-wrapper">
        <p>Loading...</p>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <>
      <div className={styles["clicker-game-container"]}>
        <div className={`${styles["clicker-sidebar"]} ${styles.shop}`}>
          <h3>Shop</h3>
          <div className={styles["shop-section"]}>
            <h4>Tools</h4>
            <div className={styles["shop-grid"]}>
              {shop.length > 0 ? shop : <p>All tools purchased!</p>}
            </div>
          </div>
          <div className={styles.shopSection}>
            <h4>Upgrades</h4>
            {nextUpgrade ? (
              <button
                onClick={handleAutoclickerUpgrade}
                className={styles.shopItem}
              >
                <div className={styles.pickaxeWrapper}>
                  <img
                    src="/assets/clickerGame/models/images/autoclicker.png"
                    alt="Autoclicker"
                    className={`${styles.pickaxeIcon} ${styles.autoclickerIcon}`}
                  />
                </div>
                <div className={styles.itemPrice}>
                  Autoclicker Lv. {autoClickLevel + 1}
                </div>
                <div className={styles.materialCostList}>
                  {Object.entries(nextUpgrade.cost).map(([mat, amt]) => {
                    const current = materials[mat] || 0;
                    const insufficient = current < amt;
                    return (
                      <div key={mat} className={styles.materialCost}>
                        <img
                          src={`/assets/clickerGame/materials/${mat}.png`}
                          alt={mat}
                          className={styles.materialIcon}
                        />
                        <span
                          className={
                            insufficient
                              ? styles.materialCountInsufficient
                              : styles.materialCount
                          }
                        >
                          {current} / {amt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </button>
            ) : (
              <p>Maxed Out!</p>
            )}
          </div>
        </div>

        <div className={styles["clicker-main"]}>
          <div className={styles["status-bar"]}>
            <span>Points: {points}</span>
            <span>Current Tool: {tool}</span>
          </div>
          <div style={{ position: "relative" }}>
            <canvas ref={canvasRef} className={styles["clicker-canvas"]} />
            {lastDrop && (
              <div className={styles.materialPopup}>
                <img
                  src={`/assets/clickerGame/materials/${lastDrop.name}.png`}
                  alt={lastDrop.name}
                />
                <span>
                  {lastDrop.count}x{" "}
                  {materialNames[lastDrop.name] || lastDrop.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={`${styles["clicker-sidebar"]} ${styles.inventory}`}>
          <h3>Inventory</h3>

          <div className={styles["shop-section"]}>
            <h4>Tools</h4>
            <div className={styles["shop-grid"]}>
              {inventory
                .filter((item) => item !== "hand")
                .map((item, i) => {
                  const filename = item === "gold" ? "golden" : item;
                  return (
                    <div
                      key={i}
                      className={`${styles.shopItem} ${
                        item === tool ? styles.equipped : ""
                      }`}
                    >
                      <div className={styles.pickaxeWrapper}>
                        <img
                          src={`/assets/clickerGame/models/images/${filename}_pick.png`}
                          alt={`${item} pickaxe`}
                          className={styles.pickaxeIcon}
                        />
                      </div>
                      <div className={styles.itemPrice}>
                        {item.charAt(0).toUpperCase() + item.slice(1)} Pickaxe
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className={styles["shop-section"]}>
            <h4>Materials</h4>
            <div className={styles["inventory-grid"]}>
              {Object.entries(materials).map(([mat, count]) =>
                count > 0 ? (
                  <div key={mat} className={styles.inventoryItem}>
                    <img
                      src={`/assets/clickerGame/materials/${mat}.png`}
                      alt={mat}
                    />
                    {materialNames[mat] || mat} x{count}
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>

        <footer className={styles.disclaimer}>
          <em>
            NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED
            WITH MOJANG OR MICROSOFT.
          </em>
        </footer>
      </div>
    </>
  );
};

export default ClickerGame;
