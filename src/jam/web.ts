import type { JamNameService } from "./names";
import type { JamFileSystem } from "./filesystem";
export class JamWebClient { constructor(public readonly fs: JamFileSystem, public readonly names: JamNameService) {} }
