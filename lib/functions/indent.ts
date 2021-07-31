export default function (indentLevel = 0) {
  return Array(indentLevel * 4)
    .fill(' ')
    .join('')
}
