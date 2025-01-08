export interface PathItem {
  repo: string;
  path: string;
}

export interface LabelValueItem<T> {
  label: string;
  value: T;
}

export interface FileItem extends PathItem { name: string }

export interface FileStat {
  mtime: number,
  birthtime: number,
  size: number,
}

export interface FileReadResult {
  content: string,
  stat: FileStat,
  hash: string,
  writeable: boolean,
}

export interface BaseDoc extends PathItem {
  type: 'file' | 'dir' | `__${string}`;
  name?: string
}

export interface Doc extends BaseDoc {
  name: string;
  content?: string;
  title?: string;
  passwordHash?: string;
  contentHash?: string;
  stat?: FileStat,
  writeable?: boolean,
  status?: 'loaded' | 'save-failed' | 'saved' | 'unsaved';
  absolutePath?: string,
  plain?: boolean;
  extra?: any;
}

export interface Repo {
  name: string;
  path: string;
  enableIndexing: boolean;
}
