export interface FetchError {
  status?: number
  statusText?: string
}

/**
 * @param toFetch Request path.
 * @param resFormat Response format valid values: 'text' 'json' 'blob'.
 * @param success Handling the parsed response format.
 * @param config Optional fetch config.
 */
export async function fetching(
  toFetch: string,
  resFormat: 'text' | 'json' | 'blob',
  success: (data: any) => void,
  error: (err: Object | FetchError | undefined) => void,
  config?: RequestInit
): Promise<void> {
  try {
    let response: Response

    //prettier-ignore
    config
      ? response = await fetch(toFetch, config)
      : response = await fetch(toFetch)

    if (!response.ok)
      throw { status: response.status, statusText: response.statusText }

    let data: any

    if (resFormat === 'text') data = await response.text()
    if (resFormat === 'blob') data = await response.blob()
    if (resFormat === 'json') data = await response.json()

    success(data)
  } catch (err) {
    error(err!)
  }
}
/**
 * USE THIS ON CATCH ERRORS ONLY. Common error handling structure.
 * @param err An object type Error.
 * @param parentElement Parent Element to put the Error message.
 * @param tagPlaceError HTML tag to place the Error message.
 */
export function fetchErrHandler(
  err: { [index: string]: any } | (FetchError & Error),
  parentElement: HTMLElement,
  tagPlaceError: keyof HTMLElementTagNameMap
): void {
  let element = document.createElement(tagPlaceError)

  element.textContent = `Error ${err.status || err.name || 'Unknown'}: ${
    err.statusText || err.cause || 'An error has ocured while fetching the URI'
  }`
  element.classList.add('fetchErrHandlerError')
  parentElement.appendChild(element)
}
