export default function (str: string) {
  return str
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean) // Filter empty strings
    .join(' ')
}
