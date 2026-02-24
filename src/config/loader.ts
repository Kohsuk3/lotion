import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { homedir } from "os";
import yaml from "js-yaml";
import { ConfigSchema } from "./schema.js";
import type { Config } from "./types.js";
import { ConfigError } from "../utils/errors.js";

const CONFIG_PATH = resolve(homedir(), ".lotion.yaml");

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return resolve(homedir(), p.slice(2));
  }
  return resolve(p);
}

export function loadConfig(configPath = getConfigPath()): Config {
  if (!existsSync(configPath)) {
    throw new ConfigError(
      `Config file not found at ${configPath}. Run 'lotion init' to set up.`
    );
  }

  let raw: unknown;
  try {
    raw = yaml.load(readFileSync(configPath, "utf8"), { schema: yaml.JSON_SCHEMA });
  } catch (err) {
    throw new ConfigError(`Failed to parse config file: ${configPath}`, err);
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid config:\n${issues}`);
  }

  return {
    ...result.data,
    output_dir: expandHome(result.data.output_dir),
  };
}

export function saveConfig(config: Config, configPath = getConfigPath()): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = yaml.dump(config, { lineWidth: -1 });
  writeFileSync(configPath, content, { encoding: "utf8", mode: 0o600 });
}

export function configExists(configPath = getConfigPath()): boolean {
  return existsSync(configPath);
}
