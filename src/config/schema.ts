import { z } from "zod";

const SyncTargetSchema = z.object({
  type: z.enum(["database", "page"]),
  id: z.string().min(1),
  name: z.string().min(1),
});

export const ConfigSchema = z.object({
  notion_api_key: z.string().min(1),
  output_dir: z.string().min(1),
  sync_interval: z.number().int().positive().default(60),
  targets: z.array(SyncTargetSchema).default([]),
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;
