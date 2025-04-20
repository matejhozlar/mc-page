// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaDiscord, FaRocket } from "react-icons/fa";
import createPhoto from "../assets/images/create.png";
import buildPhoto from "../assets/images/build.png";
import shadersPhoto from "../assets/images/shaders.jpg";
import storagePhoto from "../assets/images/storage.jpg";
import smallCog from "../assets/images/small_cog.png";
import curseForge from "../assets/images/curseforge.png";
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
    title: "🔧 Core Engineering",
    mods: [
      ["Create", "The foundation of everything mechanical."],
      ["Create: Misc & Things", "Extra gadgets to stretch your creativity."],
      ["Create: Encased", "Compact contraptions with neat casings."],
      ["Create: Trading Floor", "Automated shopfronts and trade tills."],
      ["Create: Enchantment Industry", "Magic‑powered automation factories."],
      ["Create Sifting", "Turn dust into valuable resources with gravity!"],
    ],
  },
  {
    title: "🏗️ Build & Decorate",
    mods: [
      ["Macaw’s Roofs / Fences / Walls", "Architectural details in bulk."],
      [
        "Macaw’s Doors / Windows / Trapdoors",
        "Every opening your heart desires.",
      ],
      ["Macaw’s Bridges / Paths / Pavings", "Connect villages in style."],
      [
        "Macaw’s Furniture / Lights and Lamps",
        "Home décor, from chairs to chandeliers.",
      ],
      ["FramedBlocks & Chipped", "Endless block variants to express yourself."],
    ],
  },
  {
    title: "🎨 Visual Enhancement",
    mods: [
      [
        "BSL Shaders & Complementary Shaders",
        "Realistic lighting and shadows.",
      ],
      ["Iris Shaders", "Seamless Fabric + Shader integration."],
      ["Sodium / Embeddium Dynamic Lights", "Torch‑level brightness anywhere."],
      ["ModernFix & Silent Lib", "Under‑the‑hood polish for stability."],
    ],
  },
  {
    title: "⚙️ Utilities & QoL",
    mods: [
      ["JEI & EMI Loot / Enchanting", "Never forget a recipe or enchantment!"],
      [
        "Inventory Sorter & Quick Right‑Click",
        "Streamline all your inventory hustle.",
      ],
      [
        "Nature’s Compass & Waypoints (Xaero’s)",
        "Find that mountain, monument, or home base.",
      ],
      [
        "Simple Voice Chat & Discord Integration",
        "Talk to your friends without leaving the game.",
      ],
    ],
  },
];

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
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
                <FaRocket className="rocket-icon" />
              )}
              {f.title}
            </h3>
            <p>{f.description}</p>
          </div>
        ))}
      </section>

      {/* MOD SHOWCASE */}
      <section className="mod-showcase" data-aos="fade-up">
        <h2>Mod Showcase</h2>
        {modCategories.map((cat, i) => (
          <div
            key={cat.title}
            className="mod-category"
            data-aos="fade-right"
            data-aos-delay={i * 150}
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
      </section>

      {/* JOIN CTA */}
      <section className="join-us" data-aos="zoom-in-up">
        <h2>Ready to Create?</h2>
        <p>Apply now to snag one of our limited spots!</p>
        <div className="join-buttons">
          <a href="/apply" className="btn btn-primary">
            Apply to Join
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
    </div>
  );
}
