export const encodeMarkdownLink = (path: string) => {
  return path
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20')
}
