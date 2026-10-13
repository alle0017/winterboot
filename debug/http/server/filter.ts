import { Request, Response } from "./communication.ts";
export type FilterHandler = (req: Request, res: Response, chain: FilterChain) => Promise<void> | void;
export type Filter = {
      handler: FilterHandler,
      pattern: string;
}

export class FilterChain {
      private next: FilterChain | undefined;
      private stopped = false;

      constructor(
            private readonly pattern: string,
            private readonly handler: FilterHandler,
      ) {}

      public chain(filter: FilterChain) {
            this.next = filter;
      }

      public stop() {
            this.stopped = true;
      }

      public async execute(req: Request, res: Response): Promise<void> {
            if (req.url.includes(this.pattern)) {
                  await this.handler(req, res, this)
            }
            if (this.stopped) {
                  this.stopped = false;
                  return;
            }
            return this.next?.execute(req, res);
      }
}