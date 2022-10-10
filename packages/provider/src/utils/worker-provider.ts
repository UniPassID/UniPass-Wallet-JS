import * as Comlink from 'comlink'
import { webWorker } from './web-worker'

export const worker = Comlink.wrap<any>(webWorker)
