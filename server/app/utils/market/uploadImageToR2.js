import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file to Cloudflare R2 and returns the public URL.
 *
 * @param {Object} file - The multer file object.
 * @param {string} destinationPath - The destination path (e.g. "company-assets/123/logo").
 * @returns {Promise<string>} - The public URL to the uploaded file.
 */
export async function uploadImageToR2(file, destinationPath, filename = null) {
  if (!file?.buffer || !file.mimetype || !file.originalname) {
    throw new Error("Invalid file provided");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeFilename = filename || `${uuidv4()}${ext}`;
  const key = `${destinationPath}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  const publicUrl = `https://market-assets.createrington.com/${key}`;
  return publicUrl;
}
