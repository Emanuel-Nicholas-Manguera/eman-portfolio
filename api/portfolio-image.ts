import { portfolioImage } from '../server/portfolioImage.js'

export default { fetch: portfolioImage(process.env) }
