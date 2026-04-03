export interface Team {
  id: string;
  name: string;
}

export interface DriveEntry {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  latestVersion: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    storageKey?: string;
    url: string;
  } | null;
  updatedAt: string;
}

export interface DriveEntryWithVersions {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  versions: {
    id: string;
    version: number;
    size: number;
    mimeType: string;
    url: string;
    createdAt: string;
  }[];
}

export interface FileVersion {
  id: string;
  version: number;
  size: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

export type ViewMode = "grid" | "list";
