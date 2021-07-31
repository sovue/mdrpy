export default function (str: string) {
  return str.startsWith('"') ? str : `"${str}"`
}
