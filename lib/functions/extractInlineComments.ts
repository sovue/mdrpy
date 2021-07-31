export default function (str: string) {
  let [content, ...rest] = str.split('#')
  const inlineComment = rest.join('#') // Only first occurence is a comment

  return [content.trim(), inlineComment.trim()]
}
