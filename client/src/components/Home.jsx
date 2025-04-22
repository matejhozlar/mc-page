// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaDiscord, FaRocket, FaPaypal } from "react-icons/fa";
import createPhoto from "../assets/images/create.png";
import buildPhoto from "../assets/images/build.png";
import shadersPhoto from "../assets/images/shaders.jpg";
import storagePhoto from "../assets/images/storage.jpg";
import smallCog from "../assets/images/small_cog.png";
import curseForge from "../assets/images/curseforge.png";
import Logo from "../assets/logo/logo.png";
import potatoes from "../assets/potatos/potatos.js";
import "./css/Home.css";

// Define the images array
const images = [createPhoto, buildPhoto, shadersPhoto, storagePhoto];

const features = [
  {
    title: "Create 6.0.4",
    description:
      "From cogwheels to mechanical presses, Create mod turns Minecraft into an engineering art form. Automate farms, factories, build working trains and manage your storage system!",
  },
  {
    title: "DC Integration",
    description:
      "Seamlessly send messages and images between Minecraft, Discord and our Web with our real-time integration — stay connected with players anytime, from anywhere.",
  },
  {
    title: "Easy Download",
    description:
      "Jump into the adventure with just one click! Our custom modpack is available through CurseForge, meaning no technical know-how or Minecraft modding experience required!",
  },
  {
    title: "Performance",
    description:
      "Sodium, Iris & BSL Shaders bring buttery‑smooth framerates and eye‑popping skies, while FTB Chunks and Server Performance keep your world snappy even with dozens of players online.",
  },
];

const modCategories = [
  {
    title: "Exploration & World",
    mods: [
      ["Xaero's Minimap", "Navigate easily with detailed maps."],
      ["Xaero's World Map", "Uncover and explore your world at scale."],
      ["Nature's Compass", "Locate specific biomes quickly."],
      ["Farmer's Delight", "Grow, cook, and feast like never before."],
      ["Aquaculture 2", "Expand fishing with new fish and gear."],
    ],
  },
  {
    title: "Utility & QoL",
    mods: [
      ["Inventory Sorter", "Keep your inventory tidy with one click."],
      ["Just Enough Items (JEI)", "Crafting and recipe lookup made easy."],
      ["Polymorph", "Handle conflicting recipes gracefully."],
      ["Mouse Tweaks", "Drag-to-sort and stack items faster."],
      ["Quick Right-Click", "Boost interactions and productivity."],
      ["Simple Voice Chat", "Talk with players directly in-game."],
    ],
  },
  {
    title: "Building & Decoration",
    mods: [
      ["Chipped", "Customize block variants for decoration."],
      ["Rechiseled", "Revamp your blocks with endless styles."],
      ["Macaw's Furniture", "Stylish home interiors made easy."],
      ["FramedBlocks", "Custom shaped building blocks."],
      ["Macaw's Roofs", "Add angled roofs to any build."],
      ["Macaw's Doors", "Beautiful doors in all materials."],
    ],
  },
  {
    title: "Tech & Automation",
    mods: [
      ["Create", "Mechanical automation at its finest."],
      ["Applied Energistics 2", "Store and auto-craft with ME systems."],
      ["FTB Chunks", "Claim and protect your land."],
      ["FTB Quests", "Progress and reward system for players."],
      [
        "Server Performance",
        "Our Server is well optimized and ready for new players!",
      ],
    ],
  },
];

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showFullModlist, setShowFullModlist] = useState(false);
  const [modSearch, setModSearch] = useState("");
  const [potatoMode, setPotatoMode] = useState(false);
  const [potatoImage, setPotatoImage] = useState(null);

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: true,
      mirror: false,
    });

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();

    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-overlay" data-aos="fade-down">
          <h1>Welcome to Createrington</h1>
          <p>
            A Minecraft engineering wonderland – where your wildest contraptions
            come alive. Build, automate, decorate and explore with a hand‑picked
            selection of 100+ mods!
          </p>
        </div>
        {isMobile ? (
          <div
            id="heroCarousel"
            className="carousel slide hero-carousel"
            data-bs-ride="carousel"
            data-bs-interval="3000"
          >
            <div className="carousel-inner">
              {images.map((src, i) => (
                <div
                  className={`carousel-item ${i === 0 ? "active" : ""}`}
                  key={i}
                >
                  <img
                    src={src}
                    className="d-block w-100 hero-img"
                    alt={`Slide ${i + 1}`}
                    onClick={() => setFullscreenImage(src)}
                    style={{ cursor: "zoom-in" }}
                  />
                </div>
              ))}
            </div>

            {/* Indicators */}
            <div className="carousel-indicators">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  data-bs-target="#heroCarousel"
                  data-bs-slide-to={i}
                  className={i === 0 ? "active" : ""}
                  aria-current={i === 0 ? "true" : undefined}
                  aria-label={`Slide ${i + 1}`}
                ></button>
              ))}
            </div>

            {/* Controls */}
            <button
              className="carousel-control-prev"
              type="button"
              data-bs-target="#heroCarousel"
              data-bs-slide="prev"
            >
              <span
                className="carousel-control-prev-icon"
                aria-hidden="true"
              ></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className="carousel-control-next"
              type="button"
              data-bs-target="#heroCarousel"
              data-bs-slide="next"
            >
              <span
                className="carousel-control-next-icon"
                aria-hidden="true"
              ></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        ) : (
          <div className="hero-gallery">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Gallery ${i + 1}`}
                className="hero-img"
                onClick={() => setFullscreenImage(src)}
                style={{ cursor: "zoom-in" }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ABOUT */}
      <section className="about" data-aos="fade-up">
        <h2>About Our Server</h2>
        <p>
          Step into Createrington, a fully curated modpack and multiplayer
          server designed for visionaries, engineers, artists, and adventurers
          alike. Whether you’re building a cozy village, engineering fantastical
          machines, or simply soaking in the visual splendor of immersive
          shaders, Createrington offers a rich, refined, and endlessly creative
          sandbox experience.
        </p>
        <p>
          From the moment you join, Createrington opens the door to boundless
          creativity. Build cozy farms with Farmer’s Delight, power intricate
          machines using the Create mod and its many expansions, and shape
          stunning structures with Macaw’s building suite, Chipped, and
          Rechiseled. Whether you’re organizing with Applied Energistics 2,
          soaring with the Builders' Jetpack, or fine-tuning your world with
          immersive shaders and dynamic lighting, every mod is a tool to bring
          your ideas to life. There's no set path—just a sandbox full of
          potential.
        </p>
      </section>

      {/* FEATURES */}
      <section className="features">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="feature-card"
            data-aos="flip-left"
            data-aos-delay={i * 100}
          >
            <h3 className="feature-heading">
              {f.title === "Create 6.0.4" && (
                <img src={smallCog} alt="Cog" className="spinning-cog" />
              )}
              {f.title === "DC Integration" && (
                <FaDiscord className="inline-icon discord-icon" />
              )}
              {f.title === "Easy Download" && (
                <a href="https://www.curseforge.com/">
                  <img
                    src={curseForge}
                    alt="curseforge logo"
                    className="curse-forge"
                  />
                </a>
              )}
              {f.title === "Performance" && (
                <FaRocket
                  className="rocket-icon"
                  onClick={() => {
                    const potatoArray = Object.values(potatoes);
                    const randomPotato =
                      potatoArray[
                        Math.floor(Math.random() * potatoArray.length)
                      ];
                    setPotatoImage(randomPotato);
                    setPotatoMode(true);
                  }}
                  style={{ cursor: "pointer" }}
                />
              )}
              {f.title}
            </h3>
            <p>{f.description}</p>
          </div>
        ))}
      </section>

      {/* MOD SHOWCASE */}
      <section className="modpack-section" data-aos="fade-up">
        <div className="modpack-header">
          <img src={Logo} alt="Modpack Logo" />
          <h2>Modpack</h2>
        </div>
        <p>
          View the full curated list of mods included in our pack. Visit our
          modpack page on
          <a
            href="https://www.curseforge.com/minecraft/modpacks/create-rington"
            target="_blank"
            rel="noopener noreferrer"
          >
            CurseForge
          </a>
          .
        </p>

        <div className="modpack-categories">
          {modCategories.map((cat, i) => (
            <div
              key={cat.title}
              className="modpack-category"
              data-aos="fade-up"
              data-aos-delay={i * 100}
            >
              <h3>{cat.title}</h3>
              <ul>
                {cat.mods.map(([name, desc]) => (
                  <li key={name}>
                    <strong>{name}</strong> — {desc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="full-modlist" data-aos="fade-up">
        <h2>Full Modlist</h2>
        <button
          className="home-btn home-btn-primary"
          onClick={() => setShowFullModlist((prev) => !prev)}
        >
          {showFullModlist ? "Hide" : "Show"}
        </button>
        {showFullModlist && (
          <input
            type="text"
            placeholder="Search mods..."
            className="modlist-search"
            value={modSearch}
            onChange={(e) => setModSearch(e.target.value)}
          />
        )}
        <div
          className={`modlist-container ${
            showFullModlist ? "expanded" : "collapsed"
          }`}
        >
          <ul>
            {[
              "AppleSkin",
              "Applied Energistics 2",
              "Applied Energistics 2 Wireless Terminals",
              "Aquaculture 2",
              "Architectury API",
              "Athena",
              "BSL Shaders",
              "Borderless Window",
              "Builders' Jetpack Mod",
              "Carry On",
              "Chipped",
              "Chunk Sending",
              "Clumps",
              "Collective",
              "Complementary Shaders - Reimagined",
              "Complementary Shaders - Unbound",
              "Connectivity",
              "Controlling",
              "Corn Delight[Forge]",
              "CoroUtil",
              "Corpse",
              "Corpse x Curios API Compat",
              "Create",
              "Create : Misc & Things",
              "Create Confectionery",
              "Create Encased",
              "Create Sifting",
              "Create Stuff 'N Additions",
              "Create: Dragons Plus",
              "Create: Enchantment Industry",
              "Create: Garnished",
              "Create: Oxidized",
              "Create: Structures Arise",
              "Create: Trading Floor",
              "Cupboard",
              "Curios API",
              "Discord & Chat Images",
              "EMI",
              "EMI Enchanting",
              "EMI Loot",
              "FTB Chunks",
              "FTB Library",
              "FTB Quests",
              "FTB Teams",
              "Farmer's Delight",
              "FerriteCore",
              "FramedBlocks",
              "Freecam",
              "Fresh Animations,",
              "Fusion (Connected ATextures)",
              "Fzzy Config",
              "GJEB (GammaJustExtremeBright)",
              "GuideME",
              "Inventory Sorter",
              "Iris Shaders",
              "Jade Addons",
              "Jade",
              "Just Enough Items (JEI)",
              "Kotlin for Forge",
              "Lootr",
              "Macaw's Bridges",
              "Macaw's Doors",
              "Macaw's Fences and Walls",
              "Macaw's Furniture",
              "Macaw's Lights and Lamps",
              "Macaw's Paintings",
              "Macaw's Paths and Pavings",
              "Macaw's Roofs",
              "Macaw's Stairs",
              "Macaw's Trapdoors",
              "Macaw's Windows",
              "ModernFix",
              "Mouse Tweaks",
              "Mysterious Mountain Lib",
              "Nature's Compass",
              "Ok Zoomer - It's Zoom!",
              "Packet Fixer",
              "Polymorph",
              "Quick Right-Click",
              "ReForgedPlay",
              "Rechiseled",
              "Rechiseled: Chipped",
              "Rechiseled: Create",
              "Reese's Sodium Options",
              "Resourceful Lib",
              "Scarecrows' Territory",
              "Searchables",
              "Server Performance - Smooth Chunk Save",
              "Silent Gear",
              "Silent Lib (silentlib)",
              "Simple Voice Chat",
              "Skin Layers 3D",
              "Sodium",
              "Sodium Extra",
              "Sodium/Embeddium Dynamic Lights",
              "Sodium/Embeddium Options API",
              "Sophisticated Backpacks",
              "Sophisticated Core",
              "Sound Physics Remastered",
              "Storage Drawers",
              "SuperMartijn642's Config Lib",
              "SuperMartijn642's Core Lib",
              "TxniLib",
              "What Are They Up To (Watut)",
              "Xaero's Minimap",
              "Xaero's World Map",
              "[EMF] Entity Model Features",
              "[ETF] Entity Texture Features",
              "fix GPU memory leak",
            ]
              .filter((mod) =>
                mod.toLowerCase().includes(modSearch.toLowerCase())
              )
              .map((mod, i) => (
                <li key={i}>{mod}</li>
              ))}
          </ul>
        </div>
      </section>

      {/* JOIN CTA */}
      <section className="join-us" data-aos="zoom-in-up">
        <h2>Ready to Create?</h2>
        <p>Apply now to snag one of our limited spots!</p>
        <div className="join-buttons">
          <NavLink
            to="/apply-to-join"
            className="home-btn home-btn-primary nav-apply-join"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Apply to Join
          </NavLink>
          <a
            href="https://www.paypal.com/donate/?hosted_button_id=FXA9DST7GHZ9A"
            target="_blank"
            rel="noopener noreferrer"
            className="home-btn home-btn-donate icon-btn"
          >
            <FaPaypal className="paypal-icon" />
            Donate
          </a>
        </div>
      </section>
      {fullscreenImage && (
        <div
          className="fullscreen-overlay"
          onClick={() => setFullscreenImage(null)}
        >
          <img src={fullscreenImage} alt="Fullscreen" />
        </div>
      )}
      {potatoMode && (
        <div
          className="fullscreen-overlay"
          onClick={() => setPotatoMode(false)}
        >
          <img src={potatoImage} alt="Potato Surprise" />
        </div>
      )}
    </div>
  );
}
