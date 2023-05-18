import * as Comlink from 'comlink'
import { WebWorker } from './webWorker'

export const worker = Comlink.wrap<any>(WebWorker)
