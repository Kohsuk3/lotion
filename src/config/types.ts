export type SyncTargetType = "database" | "page";

export interface SyncTarget {
  type: SyncTargetType;
  id: string;
  name: string;
}

export interface Config {
  notion_api_key: string;
  output_dir: string;
  sync_interval: number;
  targets: SyncTarget[];
}
