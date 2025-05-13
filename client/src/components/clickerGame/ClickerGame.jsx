import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { SkinViewer } from "skinview3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import styles from "../css/clickerGame.module.css";
import {
  toolCosts,
  toolMaterialCosts,
  materialDrops,
  materialNames,
  autoClickerUpgrades,
  toolOrder,
  valuePerClick,
  offlineEarningsUpgrades,
} from "./data/toolData";
import { SMELTING_RECIPES } from "./data/furnaceData";

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
  const [shopTab, setShopTab] = useState("tools");
  const [inventoryTab, setInventoryTab] = useState("tools");
  const [furnaceLevel, setFurnaceLevel] = useState(0);
  const [smeltingQueue, setSmeltingQueue] = useState([]);
  const [coalReserve, setCoalReserve] = useState(0);
  const [smeltAmounts, setSmeltAmounts] = useState({});
  const [smeltingProgress, setSmeltingProgress] = useState(0);
  const [offlineEarned, setOfflineEarned] = useState(null);
  const [offlineEarningsLevel, setOfflineEarningsLevel] = useState(0);
  const [offlineSmelted, setOfflineSmelted] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialAmounts, setMaterialAmounts] = useState({});
  const materialMenuRef = useRef(null);

  const ignoreClickRef = useRef(false);

  const upgradeFurnace = () => {
    if (furnaceLevel >= 8) return;
    const cobbleCost = 20 + furnaceLevel * 10;
    const coalCost = 1 + Math.floor(furnaceLevel / 2);

    if (
      (materials.cobble_stone || 0) >= cobbleCost &&
      (materials.coal || 0) >= coalCost
    ) {
      setMaterials((prev) => ({
        ...prev,
        cobble_stone: prev.cobble_stone - cobbleCost,
        coal: prev.coal - coalCost,
      }));
      setFurnaceLevel((prev) => prev + 1);
    }
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
        if (data.offline_earned) {
          setOfflineEarned(data.offline_earned);
        }
        setOfflineEarningsLevel(data.offline_earnings_level || 0);
        setPoints(data.points);
        setTool(data.tool);
        setInventory(data.inventory || ["hand"]);
        setMaterials(data.materials);
        setAutoClickLevel(data.auto_click_level);
        setFurnaceLevel(data.furnace_level);
        setCoalReserve(data.coal_reserve);
        setSmeltingQueue(data.smelting_queue || []);
        setSmeltAmounts(data.smelt_amounts || {});

        if (data.offline_smelted && Object.keys(data.offline_smelted).length) {
          setOfflineSmelted(data.offline_smelted);
        }
      });
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
    if (
      furnaceLevel === 0 ||
      !(smeltingQueue?.length > 0) ||
      coalReserve < 0.25
    )
      return;

    const smeltRate = 5000 / furnaceLevel;
    let progress = 0;
    const increment = 100 / (smeltRate / 100);

    const progressInterval = setInterval(() => {
      progress += increment;
      if (progress > 100) progress = 100;
      setSmeltingProgress(progress);
    }, 100);

    const smeltInterval = setInterval(() => {
      progress = 0;
      setSmeltingProgress(0);

      setSmeltingQueue((prevQueue) => {
        if (prevQueue.length === 0) return prevQueue;

        const [ore, ...rest] = prevQueue;
        const recipe = SMELTING_RECIPES[ore];
        if (!recipe) return rest;

        const hasEnoughOre = (materials[ore] || 0) >= recipe.inputAmount;
        const hasEnoughCoal = coalReserve >= 0.25;

        if (!hasEnoughOre || !hasEnoughCoal) return prevQueue;

        // Perform smelt
        setMaterials((prev) => ({
          ...prev,
          [ore]: prev[ore] - recipe.inputAmount,
          [recipe.output]: (prev[recipe.output] || 0) + recipe.amount,
        }));
        setCoalReserve((prev) => prev - 0.25);

        return rest;
      });
    }, smeltRate);

    return () => {
      clearInterval(smeltInterval);
      clearInterval(progressInterval);
      setSmeltingProgress(0);
    };
  }, [furnaceLevel, smeltingQueue, coalReserve, materials]);

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
  }, [autoClickLevel, tool, autoclickerReady, autoclickerFullyReady]);

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
          const old = rightArm.children.find((child) => child.name === "tool");
          if (old) {
            rightArm.remove(old);
          }

          rightArm.add(model);
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
  }, [skinUrl, tool]);

  const handleUpgrade = (newTool) => {
    const cost = toolCosts[newTool];
    const materialCost = toolMaterialCosts[newTool] || {};

    const currentMaxTier = Math.max(
      ...inventory.map((item) => toolOrder.indexOf(item))
    );
    const newTier = toolOrder.indexOf(newTool);

    const hasEnoughMaterials = Object.entries(materialCost).every(
      ([mat, amt]) => (materials[mat] || 0) >= amt
    );

    if (points >= cost && newTier > currentMaxTier && hasEnoughMaterials) {
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
      console.warn("Insufficient materials, points, or tool not unlocked.");
    }
  };

  useEffect(() => {
    if (!lastDrop) return;

    const timeout = setTimeout(() => {
      setLastDrop(null);
    }, 2500);

    return () => clearTimeout(timeout);
  }, [lastDrop]);

  const shop = toolOrder
    .filter((name) => !inventory?.includes(name))
    .map((name, index) => {
      const cost = toolCosts[name];
      const materialCost = toolMaterialCosts[name] || {};
      const toolIndex = toolOrder.indexOf(name);
      const maxInventoryTier = Math.max(
        ...inventory.map((i) => toolOrder.indexOf(i))
      );
      const unlocked = toolIndex <= maxInventoryTier + 1;
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
    const handleMouseUp = () => {
      setTimeout(50);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ignoreClickRef.current) return;

      if (
        materialMenuRef.current &&
        !materialMenuRef.current.contains(event.target)
      ) {
        setSelectedMaterial(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (lastDrop?.timeoutId) {
        clearTimeout(lastDrop.timeoutId);
      }
    };
  }, [lastDrop]);

  const saveProgress = useCallback(
    (override = null) => {
      if (!user) return;

      const payload = override || {
        points,
        tool,
        inventory,
        materials,
        auto_click_level: autoClickLevel,
        furnace_level: furnaceLevel,
        coal_reserve: coalReserve,
        smelting_queue: smeltingQueue,
        smelt_amounts: smeltAmounts,
        offline_earnings_level: offlineEarningsLevel,
      };

      fetch("/api/game-data", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Save failed");
          return res.json();
        })
        .then((json) => {
          if (!json.success) console.warn("Server rejected save:", json);
        })
        .catch((err) => {
          console.error("Failed to save progress", err);
        });
    },
    [
      user,
      points,
      tool,
      inventory,
      materials,
      autoClickLevel,
      furnaceLevel,
      coalReserve,
      smeltingQueue,
      smeltAmounts,
      offlineEarningsLevel,
    ]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress();
    }, 5000);

    return () => clearInterval(interval);
  }, [saveProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        points,
        tool,
        inventory,
        materials,
        auto_click_level: autoClickLevel,
        furnace_level: furnaceLevel,
        coal_reserve: coalReserve,
        smelting_queue: smeltingQueue,
        smelt_amounts: smeltAmounts,
        offline_earnings_level: offlineEarningsLevel,
      });

      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/game-data", blob);
      navigator.sendBeacon("/api/game-logout");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    points,
    tool,
    inventory,
    materials,
    autoClickLevel,
    furnaceLevel,
    coalReserve,
    smeltingQueue,
    smeltAmounts,
    offlineEarningsLevel,
  ]);

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
      {offlineEarned && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Welcome back!</h2>
            <p>
              You earned {offlineEarned.points} points while offline for{" "}
              {offlineEarned.minutes} minutes.
            </p>
            <ul>
              {Object.entries(offlineEarned.materials).map(([mat, amt]) => (
                <li key={mat}>
                  {amt} × {materialNames[mat] || mat}
                </li>
              ))}
            </ul>
            <button onClick={() => setOfflineEarned(null)}>Awesome!</button>
          </div>
        </div>
      )}
      {offlineSmelted && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Welcome back!</h2>
            <p>You smelted while you were away:</p>
            <ul>
              {Object.entries(offlineSmelted).map(([mat, count]) => (
                <li key={mat}>
                  {count} × {materialNames[mat] || mat}
                </li>
              ))}
            </ul>
            <button onClick={() => setOfflineSmelted(null)}>Got it!</button>
          </div>
        </div>
      )}
      <div className={styles["clicker-game-container"]}>
        {/* === SHOP SIDEBAR === */}
        <div className={`${styles["clicker-sidebar"]} ${styles.shop}`}>
          <h3>Shop</h3>
          <div className={styles.tabSwitchBox}>
            <button
              className={styles.tabArrow}
              onClick={() =>
                setShopTab((prev) => {
                  const tabs = ["tools", "upgrades", "materials", "loot"];
                  const currentIndex = tabs.indexOf(prev);
                  return tabs[(currentIndex + 1) % tabs.length];
                })
              }
            >
              ◀
            </button>
            <div className={styles.tabLabelText}>
              {shopTab.charAt(0).toUpperCase() + shopTab.slice(1)}
            </div>
            <button
              className={styles.tabArrow}
              onClick={() =>
                setShopTab((prev) => {
                  const tabs = ["tools", "upgrades", "materials", "loot"];
                  const currentIndex = tabs.indexOf(prev);
                  return tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                })
              }
            >
              ▶
            </button>
          </div>

          {/* Dynamic shop content */}
          {shopTab === "tools" ? (
            <div className={styles["shop-section"]}>
              <div className={styles["shop-grid"]}>
                {shop.length > 0 ? shop : <p>All tools purchased!</p>}

                {/* Upcoming pickaxes (grayed out) */}
                {[
                  "crimson_iron_pick",
                  "crimson_steel_pick",
                  "blaze_gold_pick",
                  "azure_silver_pick",
                  "azure_electrum_pick",
                  "tyrian_pick",
                ].map((filename) => (
                  <div
                    key={filename}
                    className={`${styles.shopItem} ${styles.disabledItem}`}
                  >
                    <div className={styles.pickaxeWrapper}>
                      <img
                        src={`/assets/clickerGame/models/images/${filename}.png`}
                        alt={filename.replace(/_/g, " ")}
                        className={styles.pickaxeIcon}
                      />
                      <img
                        src="/assets/clickerGame/models/images/lock_locked.png"
                        alt="Locked"
                        className={styles.lockCentered}
                      />
                    </div>
                    <div className={styles.comingSoonText}>Coming soon...</div>
                  </div>
                ))}
              </div>
            </div>
          ) : shopTab === "upgrades" ? (
            <div className={styles.shopSection}>
              {/* Autoclicker Upgrade */}
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
                <p>Autoclicker Maxed Out!</p>
              )}

              {/* Offline Earnings Upgrade (always visible, grayed if locked) */}
              {(() => {
                const locked = autoClickLevel < 1;
                const offlineUpgrade =
                  offlineEarningsUpgrades[offlineEarningsLevel];
                const canAfford =
                  offlineUpgrade &&
                  Object.entries(offlineUpgrade.cost).every(
                    ([mat, amt]) => (materials[mat] || 0) >= amt
                  );

                return offlineUpgrade ? (
                  <button
                    onClick={() => {
                      if (locked || !canAfford) return;
                      setMaterials((prev) => {
                        const updated = { ...prev };
                        for (const [mat, amt] of Object.entries(
                          offlineUpgrade.cost
                        )) {
                          updated[mat] -= amt;
                        }
                        return updated;
                      });
                      setOfflineEarningsLevel((prev) => prev + 1);
                    }}
                    className={`${styles.shopItem} ${
                      locked ? styles.disabledItem : ""
                    }`}
                  >
                    <div className={styles.pickaxeWrapper}>
                      <img
                        src="/assets/clickerGame/models/images/moon_clock.png"
                        alt="Offline Earnings"
                        className={styles.pickaxeIcon}
                      />
                      {locked && (
                        <img
                          src="/assets/clickerGame/models/images/lock_locked.png"
                          alt="Locked"
                          className={styles.lockCentered}
                        />
                      )}
                    </div>
                    <div className={styles.itemPrice}>
                      Offline Clicker Lv. {offlineEarningsLevel + 1}
                    </div>
                    <div className={styles.materialCostList}>
                      {Object.entries(offlineUpgrade.cost).map(([mat, amt]) => {
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
                  <p>Offline Earnings Maxed!</p>
                );
              })()}
            </div>
          ) : shopTab === "materials" ? (
            <div className={styles.materialShopGrid}>
              {[
                {
                  name: "cobble_stone",
                  label: "Cobblestone",
                  cost: 20,
                  max: 100,
                },
                { name: "coal", label: "Coal", cost: 50, max: 50 },
              ].map((mat) => (
                <div
                  key={mat.name}
                  className={styles.materialShopItem}
                  onClick={() =>
                    setSelectedMaterial(
                      selectedMaterial === mat.name ? null : mat.name
                    )
                  }
                >
                  <img
                    src={`/assets/clickerGame/materials/${mat.name}.png`}
                    alt={mat.label}
                  />
                  <div className="materialLabel">{mat.label}</div>

                  {selectedMaterial === mat.name && (
                    <div
                      ref={materialMenuRef}
                      className={styles.materialDetails}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="range"
                        min={1}
                        max={mat.max}
                        value={materialAmounts[mat.name] || 1}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          ignoreClickRef.current = true;
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          requestAnimationFrame(() => {
                            ignoreClickRef.current = false;
                          });
                        }}
                        onChange={(e) =>
                          setMaterialAmounts((prev) => ({
                            ...prev,
                            [mat.name]: parseInt(e.target.value),
                          }))
                        }
                      />

                      <div className={styles.materialTotal}>
                        {materialAmounts[mat.name] || 1} × {mat.cost} pts ={" "}
                        {(materialAmounts[mat.name] || 1) * mat.cost} pts
                      </div>
                      <button
                        disabled={
                          points < (materialAmounts[mat.name] || 1) * mat.cost
                        }
                        onClick={() => {
                          const amt = materialAmounts[mat.name] || 1;
                          const cost = amt * mat.cost;
                          if (points >= cost) {
                            setPoints((p) => p - cost);
                            setMaterials((m) => ({
                              ...m,
                              [mat.name]: (m[mat.name] || 0) + amt,
                            }));
                          }
                        }}
                        className={styles.buyButton}
                      >
                        Buy {materialAmounts[mat.name] || 1}x
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : shopTab === "loot" ? (
            <div className={styles.shopSection}>
              <p
                style={{
                  fontSize: "16px",
                  textAlign: "center",
                  marginTop: "20px",
                }}
              >
                🧰 Loot Crates - <strong>Coming Soon...</strong>
              </p>
            </div>
          ) : null}
        </div>

        {/* === MAIN GAME === */}
        <div className={styles["clicker-main"]}>
          {/* Status Bar */}
          <div className={styles["status-bar"]}>
            <span>Points: {points}</span>
            <span>Current Tool: {tool}</span>
          </div>

          {/* Canvas & Drop Popup */}
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

          {/* === WORKBENCHES SECTION === */}
          <div className={styles.workbenchesRow}>
            <div className={styles.workbenchesContainer}>
              <h3>Workbenches</h3>

              <div className={styles.furnaceSection}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <h4>Furnace</h4>
                  <p style={{ fontSize: "13px", color: "#bbb" }}>
                    Level: {furnaceLevel} / 8
                  </p>
                </div>

                {furnaceLevel === 0 ? (
                  <button
                    onClick={upgradeFurnace}
                    disabled={
                      (materials.cobble_stone || 0) < 20 ||
                      (materials.coal || 0) < 1
                    }
                    className={styles.shopItem}
                    style={{ marginBottom: "16px" }}
                  >
                    <div>Upgrade Furnace</div>
                    <div className={styles.materialCostList}>
                      <div className={styles.materialCost}>
                        <img
                          src={`/assets/clickerGame/materials/cobble_stone.png`}
                          alt="Cobble"
                          className={styles.materialIcon}
                        />
                        <span
                          className={
                            (materials.cobble_stone || 0) < 20
                              ? styles.materialCountInsufficient
                              : styles.materialCount
                          }
                        >
                          {materials.cobble_stone || 0} / 20
                        </span>
                      </div>
                      <div className={styles.materialCost}>
                        <img
                          src={`/assets/clickerGame/materials/coal.png`}
                          alt="Coal"
                          className={styles.materialIcon}
                        />
                        <span
                          className={
                            (materials.coal || 0) < 1
                              ? styles.materialCountInsufficient
                              : styles.materialCount
                          }
                        >
                          {materials.coal || 0} / 1
                        </span>
                      </div>
                    </div>
                  </button>
                ) : (
                  <>
                    {furnaceLevel < 8 && (
                      <button
                        onClick={upgradeFurnace}
                        disabled={
                          (materials.cobble_stone || 0) <
                            20 + furnaceLevel * 10 ||
                          (materials.coal || 0) <
                            1 + Math.floor(furnaceLevel / 2)
                        }
                        className={styles.shopItem}
                        style={{ marginBottom: "16px" }}
                      >
                        <div>Upgrade Furnace</div>
                        <div className={styles.materialCostList}>
                          <div className={styles.materialCost}>
                            <img
                              src={`/assets/clickerGame/materials/cobble_stone.png`}
                              alt="Cobble"
                              className={styles.materialIcon}
                            />
                            <span
                              className={
                                (materials.cobble_stone || 0) <
                                20 + furnaceLevel * 10
                                  ? styles.materialCountInsufficient
                                  : styles.materialCount
                              }
                            >
                              {materials.cobble_stone || 0} /{" "}
                              {20 + furnaceLevel * 10}
                            </span>
                          </div>
                          <div className={styles.materialCost}>
                            <img
                              src={`/assets/clickerGame/materials/coal.png`}
                              alt="Coal"
                              className={styles.materialIcon}
                            />
                            <span
                              className={
                                (materials.coal || 0) <
                                1 + Math.floor(furnaceLevel / 2)
                                  ? styles.materialCountInsufficient
                                  : styles.materialCount
                              }
                            >
                              {materials.coal || 0} /{" "}
                              {1 + Math.floor(furnaceLevel / 2)}
                            </span>
                          </div>
                        </div>
                      </button>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <p style={{ fontSize: "13px", color: "#bbb", margin: 0 }}>
                        Coal Reserve: {coalReserve.toFixed(1)} 🔥
                      </p>
                      <button
                        onClick={() => {
                          if ((materials.coal || 0) >= 1) {
                            setMaterials((prev) => ({
                              ...prev,
                              coal: prev.coal - 1,
                            }));
                            setCoalReserve((prev) => prev + 2);
                          }
                        }}
                        disabled={(materials.coal || 0) < 1}
                        className={styles.refillButton}
                      >
                        + Add Coal (x1)
                      </button>
                    </div>

                    <div className={styles.smeltList}>
                      {Object.keys(SMELTING_RECIPES).map((ore) => {
                        const count = materials[ore] || 0;
                        if (count === 0) return null;

                        const recipe = SMELTING_RECIPES[ore];
                        const inputAmount = recipe?.inputAmount || 1;
                        const inQueue = smeltingQueue.filter(
                          (item) => item === ore
                        ).length;
                        const availableOre =
                          (materials[ore] || 0) - inQueue * recipe.inputAmount;
                        const maxAmount = Math.min(
                          Math.floor(availableOre / recipe.inputAmount),
                          Math.floor(coalReserve / 0.25)
                        );
                        const selectedAmount = Math.min(
                          smeltAmounts[ore] || 0,
                          maxAmount
                        );
                        const coalCost = selectedAmount * 0.25;
                        const canSmelt =
                          selectedAmount > 0 && coalReserve >= coalCost;
                        const formatCount = (num) => {
                          if (num > 9999) return "9999+";
                          return num.toString().padStart(4, " ");
                        };

                        return (
                          <div key={ore} className={styles.smeltItem}>
                            <div
                              className={styles.smeltItemLeft}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                minWidth: "80px",
                              }}
                            >
                              <img
                                src={`/assets/clickerGame/materials/${ore}.png`}
                                alt={ore}
                                className={styles.materialIcon}
                              />
                              <span className={styles.smeltItemCount}>
                                {formatCount(count)}
                              </span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={Math.max(1, maxAmount)}
                              value={selectedAmount}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setSmeltAmounts((prev) => ({
                                  ...prev,
                                  [ore]: value,
                                }));
                              }}
                              className={styles.smeltSlider}
                              disabled={maxAmount === 0}
                            />

                            <div className={styles.smeltSliderLabel}>
                              <span>{selectedAmount}</span>
                              <img
                                src="/assets/clickerGame/materials/coal.png"
                                alt="Coal"
                                className={styles.materialIcon}
                              />
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color:
                                    coalReserve >= coalCost
                                      ? "#ccc"
                                      : "#e74c3c",
                                }}
                              >
                                {coalCost.toFixed(1)}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                const requiredOre =
                                  selectedAmount * inputAmount;
                                const requiredCoal = selectedAmount * 0.25;

                                if (
                                  (materials[ore] || 0) >= requiredOre &&
                                  coalReserve >= requiredCoal
                                ) {
                                  setSmeltingQueue((prev) => [
                                    ...prev,
                                    ...Array(selectedAmount).fill(ore),
                                  ]);
                                  setSmeltAmounts((prev) => ({
                                    ...prev,
                                    [ore]: 0,
                                  }));
                                }
                              }}
                              disabled={!canSmelt}
                              className={styles.shopItem}
                            >
                              Smelt
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {furnaceLevel > 0 && smeltingQueue.length > 0 && (
                <div className={styles.progressBarWrapper}>
                  <div className={styles.progressLabel}>
                    <img
                      src={`/assets/clickerGame/materials/${smeltingQueue[0]}.png`}
                      alt={smeltingQueue[0]}
                      className={styles.materialIcon}
                      style={{ marginRight: "6px", verticalAlign: "middle" }}
                    />
                    Smelting {materialNames[smeltingQueue[0]]} (
                    {smeltingQueue.length} left)
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${smeltingProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === INVENTORY SIDEBAR === */}
        <div className={`${styles["clicker-sidebar"]} ${styles.inventory}`}>
          <h3>Inventory</h3>
          <div className={styles.tabSwitchBox}>
            <button
              className={styles.tabArrow}
              onClick={() =>
                setInventoryTab((prev) =>
                  prev === "materials" ? "tools" : "materials"
                )
              }
            >
              ◀
            </button>
            <div className={styles.tabLabelText}>
              {inventoryTab.charAt(0).toUpperCase() + inventoryTab.slice(1)}
            </div>
            <button
              className={styles.tabArrow}
              onClick={() =>
                setInventoryTab((prev) =>
                  prev === "tools" ? "materials" : "tools"
                )
              }
            >
              ▶
            </button>
          </div>

          {/* Inventory content */}
          {inventoryTab === "tools" ? (
            <div className={styles["shop-section"]}>
              <div className={styles["shop-grid"]}>
                {inventory
                  .filter((item) => item !== "hand")
                  .map((item, i) => {
                    const filename = item === "gold" ? "golden" : item;
                    return (
                      <div
                        key={i}
                        onClick={() => setTool(item)}
                        className={`${styles.shopItem} ${
                          item === tool ? styles.equipped : ""
                        }`}
                        style={{
                          cursor: item !== tool ? "pointer" : "default",
                        }}
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
          ) : (
            <div className={styles["shop-section"]}>
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
          )}
        </div>

        {/* Footer */}
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
