//https://developer.wordpress.org/rest-api/reference/
export default class WPRESTAPI {
  protected DOMAIN: string
  protected URI: string
  protected API_WP: string
  protected resources: { [index: string]: string } = {}

  constructor(domain: string) {
    this.DOMAIN = domain
    this.URI = `${domain}/wp-json`
    this.API_WP = `${this.URI}/wp/v2`
  }
  public get getDOMAIN() {
    return this.DOMAIN
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
