import { z } from "zod";
const schema = z.object({
  MONGODB_URI: z
    .url()
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "Must be a MongoDB URI",
    ),
});
export function getConfig() {
  const result = schema.safeParse({ MONGODB_URI: process.env.MONGODB_URI });
  if (!result.success)
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  return result.data;
}

const clerkSchema = z.object({
  publishableKey: z.string().startsWith("pk_"),
  secretKey: z.string().startsWith("sk_"),
  webhookSecret: z.string().min(1).optional(),
});
export function authEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
}
export function getAuthConfig() {
  const result = clerkSchema.safeParse({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  });
  if (!result.success)
    throw new Error(
      "Configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for authentication",
    );
  return result.data;
}
export function publicAuthKey() {
  return authEnabled() ? getAuthConfig().publishableKey : null;
}
export function localRenderConfig() {
  const raw = z
    .url()
    .parse(process.env.APP_BASE_URL ?? "http://localhost:3000");
  return {
    appUrl: raw.replace(/\/$/, ""),
    root: process.env.LOCAL_MEDIA_DIR ?? "./.media",
  };
}

const s3UploadsSchema = z.object({
  bucketName: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
  region: z.string().regex(/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/),
});
export type S3UploadsConfig = z.infer<typeof s3UploadsSchema>;

export function s3UploadsEnabled() {
  return Boolean(process.env.S3_UPLOADS_BUCKET);
}

export function s3UploadsConfig(): S3UploadsConfig | null {
  if (!s3UploadsEnabled()) return null;
  const result = s3UploadsSchema.safeParse({
    bucketName: process.env.S3_UPLOADS_BUCKET,
    region: process.env.AWS_REGION ?? "us-east-1",
  });
  if (!result.success)
    throw new Error(
      `Invalid S3 uploads configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  return result.data;
}

const packSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  productId: z.uuid(),
  credits: z.number().int().min(1).max(1000),
});
export function legalConfig() {
  return {
    sellerName: process.env.BILLING_SELLER_NAME?.trim() || null,
    supportEmail: process.env.SUPPORT_EMAIL
      ? z.email().parse(process.env.SUPPORT_EMAIL)
      : null,
  };
}
export function paymentSettings() {
  let raw: unknown = [];
  try {
    raw = JSON.parse(process.env.POLAR_PACKS || "[]");
  } catch {
    throw new Error("Invalid configuration: POLAR_PACKS");
  }
  const packs = z.array(packSchema).max(10).parse(raw);
  if (
    new Set(packs.map((pack) => pack.id)).size !== packs.length ||
    new Set(packs.map((pack) => pack.productId)).size !== packs.length
  )
    throw new Error("Invalid configuration: duplicate POLAR_PACKS");
  return {
    packs,
    environment: z
      .enum(["sandbox", "production"])
      .parse(process.env.POLAR_ENVIRONMENT ?? "sandbox"),
    accessToken: process.env.POLAR_ACCESS_TOKEN || null,
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET || null,
  };
}
export function checkoutEnabled() {
  const settings = paymentSettings();
  const legal = legalConfig();
  return Boolean(
    settings.accessToken &&
    settings.webhookSecret &&
    settings.packs.length &&
    legal.sellerName &&
    legal.supportEmail,
  );
}

/** Paid exports remain implemented, but are opt-in until billing is launched. */
export function paidExportsEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PAID_EXPORTS === "true";
}

const anthropicModel = z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/);
export function llmSettings() {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    model: anthropicModel.parse(
      process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
    ),
    timeoutMs: 15000,
  };
}

export function remotionLambdaEnabled(): boolean {
  return Boolean(
    process.env.REMOTION_AWS_FUNCTION_NAME &&
    process.env.REMOTION_SERVE_URL &&
    (process.env.REMOTION_BUCKET_NAME || process.env.S3_BUCKET),
  );
}

export function remotionLambdaConfig() {
  if (!remotionLambdaEnabled()) return null;
  const rawRegion =
    process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || "us-east-1";
  return {
    region: rawRegion,
    functionName: process.env.REMOTION_AWS_FUNCTION_NAME!,
    serveUrl: process.env.REMOTION_SERVE_URL!,
    bucketName: (process.env.REMOTION_BUCKET_NAME || process.env.S3_BUCKET)!,
  };
}

export function cronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}
