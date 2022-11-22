/**
 * @param templateContent Template.content.
 * @param htmlNameElement Any HTML element.
 * @returns Returns the queried element.
 */
export const templateQuery = <TypeElement extends HTMLElement>(
  templateContent: DocumentFragment,
  htmlNameElement: keyof HTMLElementTagNameMap | string
): TypeElement => templateContent.querySelector(htmlNameElement) as TypeElement

/**
 * @param parent
 */
export const deleteChilds = (parent: HTMLElement): void => {
  while (parent.lastChild) {
    parent.removeChild(parent.lastChild)
  }
}
