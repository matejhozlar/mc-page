import playersRoutes from "./players.js";
import verifyTokenRoute from "./verifyToken.js";
import formRoutes from "./forms.js";
import uploadImageRoute from "./uploadImage.js";
import discordOAuthRoutes from "./discordOAuth.js";
import userRoutes from "./user.js";
import adminRoutes from "./admin.js";
import gameDataRoutes from "./gameData.js";
import currencyRoutes from "./currencyMod.js";
import cryptoRoutes from "./cryptoMod.js";
import assetsRoutes from "./assets.js";
import marketRoutes from "./marketRoutes.js";

export default function registerRoutes(
  app,
  { db, io, clientBot, webBot, serverIP, serverPort }
) {
  app.use("/api", playersRoutes(db, serverIP, serverPort));
  app.use("/api", verifyTokenRoute(db));
  app.use("/api", formRoutes(db, clientBot));
  app.use("/api", uploadImageRoute(io, webBot, "minecraft-chat"));
  app.use("/api", discordOAuthRoutes(db));
  app.use("/api", userRoutes(db));
  app.use("/api", adminRoutes(db));
  app.use("/api", gameDataRoutes(db));
  app.use("/api", currencyRoutes(db, webBot, io));
  app.use("/api", cryptoRoutes(db));
  app.use("/api", assetsRoutes());
  app.use("/api", marketRoutes(db));
}
