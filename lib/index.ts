import CyrillicToTranslit from "cyrillic-to-translit-js";
import MD from 'markdown-it'

import extractInlineComments from "./functions/extractInlineComments";
import indent from "./functions/indent";
import quoted from "./functions/quoted";
import trimWords from "./functions/trimWords";

/**
 * Parser options syntax.
 * @typedef {Object} Syntax
 * @property {string} ignore
 * @property {string} call
 * @property {string} jump
 */

/**
 * Parser options.
 * @typedef {Object} Options
 * @property {string} characterDelim - Which character delim to use (defaults to ' - ').
 * @property {Syntax} syntax - Syntax options.
 * @property {Object.<string, string>} characters -
 */
import defaultOptions from './config/defaultOptions'

const translit = new CyrillicToTranslit({
  preset: 'ru',
})
const md = new MD('commonmark')

/**
 * Parse Markdown to Ren'Py
 * @param {string} markdown - Markdown source.
 * @param {Options} [options] - Optional options object.
 * @returns string
 */
const parse = (markdown: string, options = defaultOptions) => {
  let indentLevel = 0,
    rpy = ''

  // Supporting variables
  let isConditionalList = false

  const ast = md.parse(markdown, { references: {} })

  for (let line = 0; line < ast.length; line += 1) {
    let { type, children, content: rawContent } = ast[line]

    // Should always be on top
    if (rawContent.startsWith(options.syntax.ignore)) {
      rpy += indent(indentLevel)

      rpy += `${rawContent.replace(options.syntax.ignore, '').trim()}\n`

      continue
    }

    if (type === 'blockquote_open') {
      rpy += indent(indentLevel)

      rpy += `extend `

      indentLevel -= 1

      continue
    }

    if (type === 'fence') {
      // For the fence type we don't
      // need any general transformations
      // since it contains pure code
      rpy += indent(indentLevel)

      rpy +=
        rawContent
          .trim()
          .split('\n')
          .map((codeLine: string) => `${indent(indentLevel)}${codeLine}`)
          .join('\n') + '\n'

      continue
    }

    rawContent = trimWords(rawContent)

    let [content, inlineComment] = extractInlineComments(rawContent)

    if (type === 'inline') {
      if (children?.length) {
        for (const child of children) {
          // Redo everything for child content
          // since it is different from `content`
          ;[content, inlineComment] = extractInlineComments(child.content)

          rpy += indent(indentLevel)

          switch (child.type) {
            case 'text': {
              // Handle jumps on top because
              // they don't need any transforms
              if (content.startsWith(options.syntax.call)) {
                rpy += `call ${content
                  .slice(options.syntax.call.length)
                  .trim()}`

                break
              } else if (content.startsWith(options.syntax.jump)) {
                rpy += `jump ${content
                  .slice(options.syntax.jump.length)
                  .trim()}`

                break
              }

              let [id, ...restText] = content.split(options.characterDelim)
              const text = restText.join(options.characterDelim).trim() // Limit occurrence to only first delim

              const charKeys = Object.keys(options.characters)

              // If might have character id and text
              if (text) {
                id = id.toLowerCase()

                // If has known character id
                // return ${id} "${text}"
                if (
                  charKeys
                    .concat(Object.values(options.characters))
                    .includes(id)
                ) {
                  const foundId =
                    charKeys.find((item) => options.characters[item as keyof typeof options.characters] === id) ||
                    id

                  rpy += `${foundId} ${quoted(text)}`
                }
                  // If doesn't have known character id
                // return full content
                else {
                  rpy += `${quoted(content)}`
                }
              } else {
                rpy += `${quoted(content)}`
              }

              break
            }

            case 'code_inline': {
              // Use child's content since
              // it doesn't include '``'
              rpy += `$ ${content}`

              break
            }
          }

          rpy += `${inlineComment ? ` # ${inlineComment}` : ''}\n`
        }
      }
    } else {
      switch (type) {
        case 'heading_open': {
          rpy += `${line === 0 ? '' : '\n'}label ${translit.transform(
            ast[++line].content,
            '_'
          )}:`

          rpy += '\n'

          indentLevel = 1

          break
        }

        case 'bullet_list_open': {
          if (ast[line + 3].content.startsWith('?')) {
            isConditionalList = true
          } else {
            rpy += indent(indentLevel)

            rpy += 'menu:\n'

            indentLevel += 1
          }

          break
        }

        case 'list_item_open': {
          rpy += indent(indentLevel)

          // Since we're skipping the loop
          // we need to handle inline comments
          // here
          let [choiceContent, inlineComment] = extractInlineComments(
            ast[(line += 2)].content
          )
          // Extract conditional choice character
          if (choiceContent.startsWith('???')) {
            rpy += `else:`
          } else if (choiceContent.startsWith('??')) {
            rpy += `elif ${choiceContent.slice(2).trim()}:`
          } else if (choiceContent.startsWith('?')) {
            rpy += `if ${choiceContent.slice(1).trim()}:`
          } else {
            if (choiceContent.includes('|')) {
              const [choice, ...rest] = choiceContent.split('|')
              const conditional = rest.join('|').trim()

              rpy += `${quoted(choice.trim())} if ${conditional}:`
            } else {
              rpy += `${quoted(choiceContent)}:`
            }
          }

          rpy += `${inlineComment ? ` # ${inlineComment}` : ''}\n`

          indentLevel += 1

          break
        }

        case 'list_item_close': {
          indentLevel -= 1

          break
        }

        case 'bullet_list_close': {
          if (isConditionalList) {
            isConditionalList = false
          } else {
            indentLevel -= 1
          }

          break
        }

        case 'blockquote_close': {
          indentLevel += 1

          break
        }

        case 'html_block': {
          rpy += indent(indentLevel)

          rpy += content.replace('<!--', '#').replace('-->', '').trim()

          rpy += '\n'

          break
        }
      }
    }
  }

  return rpy
}

export {parse};
