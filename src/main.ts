import './style.css'

interface FetchError {
  status?: number
  statusText?: string
}

const d: Document = document,
  $site = d.querySelector<HTMLElement>('#site') as HTMLElement,
  $posts = d.querySelector<HTMLElement>('#posts') as HTMLElement,
  $loader = d.querySelector<HTMLDivElement>('.loader') as HTMLDivElement,
  $loaderMessage = $loader.querySelector<HTMLElement>('h2') as HTMLElement,
  $postTemplate = d.querySelector<HTMLTemplateElement>(
    '#post-template'
  ) as HTMLTemplateElement,
  $fragment: DocumentFragment = d.createDocumentFragment(),
  $template: DocumentFragment = $postTemplate.content

const templateQuery = <TypeElement extends HTMLElement>(
  htmlNameElement: keyof HTMLElementTagNameMap | string
): TypeElement => $template.querySelector(htmlNameElement) as TypeElement

const removeAllChilds = <TypeHTMLElement extends HTMLElement>(
  parent: TypeHTMLElement
): void => {
  while (parent.lastChild) {
    parent.removeChild(parent.lastChild)
  }
}
/**
 * @param toFetch Request path.
 * @param resFormat Response format valid values: 'text' 'json' 'blob'.
 * @param success Handling the parsed response format.
 * @param config Optional fetch config.
 */
async function fetching(
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
    if (err) error(err)
  }
}
/**
 * USE THIS ON CATCH ERRORS ONLY. Common error handling structure.
 * @param err An object type Error.
 * @param parentElement Parent Element to put the Error message.
 * @param tagPlaceError HTML tag to place the Error message.
 */
function fetchErrHandler(
  err: { [index: string]: any } | (FetchError & Error),
  parentElement: HTMLElement,
  tagPlaceError: keyof HTMLElementTagNameMap
): void {
  let element = document.createElement(tagPlaceError)

  element.textContent = `Error ${err.status || err.name || 'Unknown'}: ${
    err.statusText ||
    err.message ||
    'An error has occurred while fethcing the URI'
  }`

  parentElement.appendChild(element)
}

//https://developer.wordpress.org/rest-api/reference/
class WPRESTAPI {
  protected DOMAIN: string
  protected URI: string
  protected API_WP: string
  protected resources: { [index: string]: string } = {}

  constructor(domain: string) {
    this.DOMAIN = domain
    this.URI = `${domain}/wp-json`
    this.API_WP = `${this.URI}/wp/v2`
  }

  public get getURI() {
    return this.URI
  }
  public get getAllResources() {
    return this.resources
  }

  public setUpdateResource(resourceName: string, baseRoute: string): void {
    this.resources[resourceName] = `${this.API_WP}${baseRoute}`
  }

  public getResource(resourceName: string): string {
    return this.resources[resourceName]
  }

  public deleteResource(resourceName: string) {
    delete this.resources[resourceName]
  }
}

function wpInfinitePostsScroll(
  observed: HTMLElement,
  isIntersecting: (nextPage: number) => void
): void {
  let pages: number = 2
  const nextPage = (() => {
    let page = 2
    return () => {
      page += 1
      return page
    }
  })()

  const handleIntersec: IntersectionObserverCallback = (
    entries: IntersectionObserverEntry[]
  ) => {
    entries.forEach((entry: IntersectionObserverEntry) => {
      if (entry.isIntersecting) {
        isIntersecting(pages)
        pages = nextPage()
      }
    })
  }

  const observer = new IntersectionObserver(handleIntersec, {
    root: null,
    threshold: 1,
    rootMargin: '730px 0px',
  })
  observer.observe(observed)
}

function wpSiteInformation(URI: string): void {
  const site = new WPRESTAPI(URI)

  fetching(
    site.getURI,
    'json',
    json => {
      $loader.style.display = 'block'
      $site.innerHTML = `
      <h3>Sitio Web</h3>
      <h2>
        <a href="${json.url}" target="_blank" rel="noopener">${json.name}</a>
      </h2>
      <p>${json.description}</p>
      <p>${json.timezone_string}</p>
      `
      $loaderMessage.textContent = 'Loading posts...'
    },
    err => {
      console.error(err)
      if (err) fetchErrHandler(err, $site, 'h2')
      $loader.style.display = 'none'
    }
  )
}

async function getWPPosts(siteLink: string): Promise<void> {
  const site = new WPRESTAPI(siteLink)
  site.setUpdateResource('posts', '/posts?_embed&per_page=4')

  const fetchResource = async (link: string) => {
    try {
      let res: Response = await fetch(link)
      if (!res.ok) throw { status: res.status, statusText: res.statusText }
      let json: [] & {} = await res.json()

      $loaderMessage.textContent = 'Loading pots...'
      $loader.style.display = 'block'

      json.forEach((post: { [index: string]: any }) => {
        let categories: string = '',
          tags: string = ''

        let postWpTerm = post._embedded['wp:term']

        postWpTerm[0].length === 0
          ? (categories += '<p>(No categories)</p>')
          : postWpTerm[0].forEach(
              (category: string & { [index: string]: string }) =>
                categories.includes(category)
                  ? (categories += '')
                  : (categories += `<li>${category.name}</li>`)
            )

        postWpTerm[1].length === 0
          ? (tags += '<p>(No tags)</p>')
          : postWpTerm[1].forEach((tag: string & { [index: string]: string }) =>
              tags.includes(tag)
                ? (tags += '')
                : (tags += `<li>${tag.name}</li>`)
            )

        let postWpFeaturedmedia = post._embedded['wp:featuredmedia'][0]

        templateQuery<HTMLImageElement>('.post-image').src =
          postWpFeaturedmedia.source_url || post.jetpack_featured_media_url

        templateQuery<HTMLImageElement>('.post-image').alt =
          postWpFeaturedmedia.alt_text || 'Post image not found'

        templateQuery<HTMLElement>('.post-title').textContent =
          post.title.rendered

        let postAuthor = post._embedded.author[0]
        templateQuery<HTMLElement>('.post-author').innerHTML = `
            <img 
            src="${postAuthor.avatar_urls[48]}" 
            alt="${postAuthor.name}" >
            <figcaption>${postAuthor.name}</figcaption>
          `
        templateQuery<HTMLElement>('.post-date').textContent = new Date(
          post.date || '--/--/--'
        ).toLocaleString()

        templateQuery<HTMLLinkElement>('.post-link').href = post.link

        //I changed <p> for <div> and use innerHTMl instead of outerHTML due to cannot set property 'outerHTML' of null', because we are trying to set the outerHTML to an element which doesn't exist in the browsers DOM.
        templateQuery<HTMLDivElement>('.post-excerpt').innerHTML =
          post.excerpt.rendered.replace('[&hellip;]', '...')

        templateQuery<HTMLDivElement>('.post-categories').innerHTML = `
          <p>Categorías:</p><ul>${categories}</ul>`

        templateQuery<HTMLDivElement>('.post-tags').innerHTML = `
          <p>Etiquetas:</p><ul>${tags}</ul>`

        templateQuery<HTMLElement>('.post-content > article').innerHTML =
          post.content.rendered

        $fragment.appendChild(d.importNode($template, true))
      })

      $posts.appendChild($fragment)
    } catch (err) {
      if (err) fetchErrHandler(err, $posts, 'h2')
      console.error(err)
      $loader.style.display = 'none'
    }
  }

  await fetchResource(site.getResource('posts'))

  wpInfinitePostsScroll($loader, nextPage => {
    site.setUpdateResource('posts', `/posts?_embed&per_page=4&page=${nextPage}`)
    fetchResource(site.getResource('posts'))
  })
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('submit', (e: SubmitEvent) => {
    const $wpPostForm = document.querySelector<HTMLFormElement>(
      '#WP-form'
    ) as HTMLFormElement

    if (e.target === $wpPostForm) {
      e.preventDefault()

      $loader.style.display = 'block'

      if ($site.innerHTML === '' || $posts.innerHTML === '') {
        wpSiteInformation($wpPostForm.link.value)
        getWPPosts($wpPostForm.link.value)
      } else {
        removeAllChilds($site)
        removeAllChilds($posts)
        wpSiteInformation($wpPostForm.link.value)
        getWPPosts($wpPostForm.PostForm.link.value)
      }
      $wpPostForm.reset()
    }
  })
})
