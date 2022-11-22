import { templateQuery, deleteChilds } from './helpers/dom'
import { fetchErrHandler, fetching } from './helpers/fetch'
import WPRESTAPI from './models/WPRESTAPI'

const d: Document = document,
  $wpPostForm = document.querySelector<HTMLFormElement>(
    '#WP-form'
  ) as HTMLFormElement,
  $site = d.querySelector<HTMLElement>('#site') as HTMLElement,
  $posts = d.querySelector<HTMLElement>('#posts') as HTMLElement,
  $postLoader = d.querySelector<HTMLDivElement>(
    '.post-loader'
  ) as HTMLDivElement,
  $siteLoader = d.querySelector<HTMLDivElement>(
    '.site-loader'
  ) as HTMLDivElement,
  $template = d.querySelector<HTMLTemplateElement>(
    '#post-template'
  ) as HTMLTemplateElement,
  $fragment: DocumentFragment = d.createDocumentFragment(),
  $t: DocumentFragment = $template.content

let observer: IntersectionObserver = new IntersectionObserver(() => {}, {})

function wpSiteInformation(site: WPRESTAPI): void {
  fetching(
    site.getURI,
    'json',
    json => {
      $siteLoader.style.display = 'block'
      $site.innerHTML = `
      <h3>Sitio Web</h3>
      <h2>
        <a href="${json.url}" target="_blank" rel="noopener">${json.name}</a>
      </h2>
      <p>${json.description}</p>
      <p>${json.timezone_string}</p>
      `
      $siteLoader.style.display = 'none'
    },
    err => {
      console.error(err)
      fetchErrHandler(err!, $site, 'h2')
      $siteLoader.style.display = 'none'
    }
  )
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('submit', async (e: SubmitEvent) => {
    if (e.target === $wpPostForm) {
      e.preventDefault()

      if ($site.innerHTML !== '') deleteChilds($site)
      if ($posts.innerHTML !== '') deleteChilds($posts)
      $siteLoader.style.display = 'block'
      $postLoader.style.display = 'block'

      const url = $wpPostForm.link.value

      if (url === '') observer.disconnect()

      const site = new WPRESTAPI(url)
      site.setUpdateResource('posts', '/posts?_embed&per_page=4')

      wpSiteInformation(site)

      const fetchResource = async (link: string) => {
        try {
          let res: Response = await fetch(link)
          if (!res.ok) throw { status: res.status, statusText: res.statusText }
          let json: [] & {} = await res.json()

          $postLoader.style.display = 'block'

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
              : postWpTerm[1].forEach(
                  (tag: string & { [index: string]: string }) =>
                    tags.includes(tag)
                      ? (tags += '')
                      : (tags += `<li>${tag.name}</li>`)
                )

            let postWpFeaturedmedia = post._embedded['wp:featuredmedia'][0]

            templateQuery<HTMLImageElement>($t, '.post-image').src =
              postWpFeaturedmedia.source_url || post.jetpack_featured_media_url

            templateQuery<HTMLImageElement>($t, '.post-image').alt =
              postWpFeaturedmedia.alt_text || 'Post image not found'

            templateQuery<HTMLElement>($t, '.post-title').textContent =
              post.title.rendered

            let postAuthor = post._embedded.author[0]
            templateQuery<HTMLElement>($t, '.post-author').innerHTML = `
                <img 
                src="${postAuthor.avatar_urls[48]}" 
                alt="${postAuthor.name}" >
                <figcaption>${postAuthor.name}</figcaption>
              `
            templateQuery<HTMLElement>($t, '.post-date').textContent = new Date(
              post.date || '--/--/--'
            ).toLocaleString()

            templateQuery<HTMLLinkElement>($t, '.post-link').href = post.link

            //I changed <p> for <div> and use innerHTMl instead of outerHTML due to cannot set property 'outerHTML' of null', because we are trying to set the outerHTML to an element which doesn't exist in the browsers DOM.
            templateQuery<HTMLDivElement>($t, '.post-excerpt').innerHTML =
              post.excerpt.rendered.replace('[&hellip;]', '...')

            templateQuery<HTMLDivElement>($t, '.post-categories').innerHTML = `
              <p>Categorías:</p><ul>${categories}</ul>`

            templateQuery<HTMLDivElement>($t, '.post-tags').innerHTML = `
              <p>Etiquetas:</p><ul>${tags}</ul>`

            templateQuery<HTMLElement>(
              $t,
              '.post-content > article'
            ).innerHTML = post.content.rendered

            $fragment.appendChild(d.importNode($t, true))
          })

          $posts.appendChild($fragment)
        } catch (err) {
          fetchErrHandler(err!, $posts, 'h2')
          console.error(err)
          $postLoader.style.display = 'none'
        }
      }

      const nextPage = (() => {
        let page = 2
        return () => {
          page += 1
          return page
        }
      })()

      const handleIntersec: IntersectionObserverCallback = async (
        entries: IntersectionObserverEntry[]
      ) => {
        let entry = entries[0]
        if (entry.isIntersecting) {
          site.setUpdateResource(
            'posts',
            `/posts?_embed&per_page=4&page=${nextPage()}`
          )
          await fetchResource(site.getResource('posts'))
        }
      }
      observer = new IntersectionObserver(handleIntersec, {
        root: null,
        threshold: 1,
        rootMargin: '740px 0px',
      })

      d.addEventListener('change', () => observer.disconnect())
      await fetchResource(site.getResource('posts'))

      observer.observe($postLoader)

      $wpPostForm.reset()
    }
  })
})
