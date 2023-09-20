export interface PathItem {
  repo: string;
  path: string;
}

export interface FileItem extends PathItem { name: string }

export interface FileStat {
  mtime: number,
  birthtime: number,
  size: number,
}

export interface Doc extends PathItem {
  type: 'file' | 'dir';
  name: string;
  content?: string;
  title?: string;
  passwordHash?: string;
  contentHash?: string;
  stat?: FileStat,
  status?: 'loaded' | 'save-failed' | 'saved';
  absolutePath?: string,
  plain?: boolean;
}

export interface Repo {
  name: string;
  path: string;
}
