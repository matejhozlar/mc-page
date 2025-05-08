const path = require("path");
const sharp = require("sharp");
const { NodeIO } = require("@gltf-transform/core");
const { KHRMaterialsUnlit } = require("@gltf-transform/extensions");

async function brightenGlb() {
  const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);

  const inputPath = path.resolve(__dirname, "tyrian_pickaxe.glb");
  const outputPath = path.resolve(__dirname, "tyrian_pickaxe_bright.glb");

  const document = await io.read(inputPath);
  const root = document.getRoot();

  for (const tex of root.listTextures()) {
    const buf = tex.getImage();
    const brightBuf = await sharp(Buffer.from(buf))
      .modulate({ brightness: 1.2 })
      .toFormat("png")
      .toBuffer();
    tex.setImage(brightBuf);
  }

  await io.write(outputPath, document);

  console.log(`✅ Brightened GLB written to ${outputPath}`);
}

brightenGlb().catch((err) => {
  console.error("❌ Failed to brighten GLB:", err);
  process.exit(1);
});
