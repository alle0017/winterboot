import { type IncomingMessage, type ServerResponse, type OutgoingHttpHeaders } from "node:http";
import Url from "node:url"
import { CookieParser, CookieEncoder } from "./cookies.ts";

export type RouteHandler = ((req: Request, res: Response) => void) | ((req: Request, res: Response) => Promise<void>)
      
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
export interface Forwarder {
      forward(req: Request, res: Response): void
}
export type Route = {
      route: string,
      handler: RouteHandler
}
export type OutgoingMessage = ServerResponse<IncomingMessage> & { req: IncomingMessage; }

export class Request {
      public readonly pathname: Url.UrlWithParsedQuery;
      public readonly cookies: Record<string, string>;
      constructor(
            public readonly raw: IncomingMessage, 
            public readonly url: string = raw.url!, 
            public readonly method: Method = raw.method as Method
      ) {
            this.pathname = Url.parse(url, true);
            const cookies = raw.headers.cookie;
            if (cookies) {
                  this.cookies = new CookieParser(cookies).parse();
            } else {
                  this.cookies = {};
            }
      }
      public async body(): Promise<string> {
            const chunks: Uint8Array[] = [];
            for await (const chunk of this.raw) {
                  chunks.push(chunk as Uint8Array);
            }
            return Buffer.concat(chunks).toString("utf8");
      }

      public copy(url: string, method: Method) {
            return new Request(this.raw, url, method);
      }
}

export class Response {
      private readonly listeners: Set<() => void> = new Set;
      private readonly headers: OutgoingHttpHeaders = {};
      public readonly cookies: CookieEncoder = new CookieEncoder();

      constructor(public readonly raw: OutgoingMessage, private readonly forwarder: Forwarder, private readonly req: Request) {}

      public sendHeaders(status: number) {
            this.cookies.setHeader(this.headers);
            this.raw.writeHead(status, this.headers);
            return this;
      }
      public send(payload: string, status: number) {
            for (const fn of this.listeners) {
                  fn();
            }
            this.sendHeaders(status);
            this.raw.end(payload);
      }
      public sendStream(payload: string) {
            for (const fn of this.listeners) {
                  fn();
            }
            this.raw.write(payload);
      }
      public setHeader(key: string, value: string | string[]) {
            this.headers[key] = value;
      }
      public onSend(fn: () => void) {
            this.listeners.add(fn);
      }
      public json(status: number, body?: unknown) {
            const payload = body === undefined ? "" : JSON.stringify(body);
            this.setHeader("Content-Type", "application/json");
            this.send(payload, status);
      }
      public html(status: number, template: string) {
            this.setHeader("Content-Type", "text/html; charset=utf-8");
            this.send(template, status);
      }
      public redirect(url: string, method: Method = this.req.method) {
            return this.forwarder.forward(this.req.copy(url, method), this);
      }
      public end() {
            this.raw.end();
      }
}