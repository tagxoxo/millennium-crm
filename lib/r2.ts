import { S3Client } from "@aws-sdk/client-s3";
import { getEnv, getEnvOptional } from "@/lib/env";

export function getR2Client(): S3Client {
  const accountId = getEnv("CLOUDFLARE_R2_ACCOUNT_ID");
  const endpoint =
    getEnvOptional("CLOUDFLARE_R2_S3_ENDPOINT") ??
    `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: getEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function getR2Bucket(): string {
  return getEnv("CLOUDFLARE_R2_BUCKET_NAME");
}
