export const encodeMarkdownLink = path => {
  return path
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20')
}
