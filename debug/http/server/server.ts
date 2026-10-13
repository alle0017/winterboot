import { createServer, type IncomingMessage, } from "node:http";
import { Method, Route, Request, Response, OutgoingMessage, RouteHandler, Forwarder } from "./communication.ts";
import { FilterChain, FilterHandler } from "./filter.ts";

class ServerFilter extends FilterChain {
      private readonly map: Map<Method, Route[]> = new Map;

      constructor() {
            super('', (req, res) => this.run(req, res));
      }
      
      private async run(req: Request, res: Response) {
            const routes = this.map.get(req.method) ?? [];
            const pathname = req.pathname.pathname;
            for (const route of routes) {
                  if (pathname == route.route) {
                        try {
                              const promise = route.handler(req, res);
                              if (promise instanceof Promise) {
                                    await promise;
                              }
                        } catch (e) {
                              console.error(e);
                              res.json(500, { error: "internal error" });
                        }
                        return;
                  }
            }
            res.json(404, { error: `route "${req.url}" was not found` });
      }
      public route(route: string, method: Method, handler: RouteHandler) {
            this.map.getOrInsert(method, []).push({ route, handler });
            return this;
      }
}

type Message = {
      req: Request,
      res: Response,
};

class Queue<T> {
      private readonly queue: T[] = [];
      public push(value: T) {
            this.queue.push(value);
      }     
      public pop() {
            return this.queue.shift();
      }
}

export class Server implements Forwarder {
      private readonly server: ServerFilter;
      private readonly messages: Queue<Message> = new Queue;
      private isConsuming = false;
      private head: FilterChain;

      constructor() {
            this.server = new ServerFilter();
            this.head = this.server;
      }

      private async main(_req: IncomingMessage, _res: OutgoingMessage) {
            const req = new Request(_req);
            const res = new Response(_res, this, req);
            this.messages.push({ req, res });
            return this.consume();
      }

      private async consume(): Promise<void> {
            if (this.isConsuming) {
                  return;
            }

            const msg = this.messages.pop();

            if (!msg) {
                  this.isConsuming = false;
                  return;
            }
            await this.head.execute(msg.req, msg.res);
           return this.consume();
      }
      public forward(req: Request, res: Response) {
            this.messages.push({ req, res });
      }
      public filter(pattern: string, handler: FilterHandler) {
            const head = this.head;
            this.head = new FilterChain(pattern, handler);
            this.head.chain(head);
      }
      public route(route: string, method: Method, handler: RouteHandler) {
            this.server.route(route, method, handler);
            return this;
      }
      public execute(port: number) {
            const server = createServer(async (req, res) => await this.main(req, res));
            server.listen(port, () => console.log(`debug ingest server listening on http://localhost:${port}`)); 
            return server;
      }
}