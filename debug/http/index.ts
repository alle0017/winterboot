import { RouteHandler, Method, Server, Request, Response, FilterChain, FilterHandler } from './server/index.ts';

export { Request, Response };
type RouteContext = { 
      handler: RouteHandler, 
      methods: Method[], 
      route: string 
}
type FilterContext = { 
      handler: FilterHandler, 
      pattern: string
}
class RestMetaContext {
      constructor(private readonly meta: DecoratorMetadataObject) {}
      get methods() {
            this.meta.methods ??= [];
            return this.meta.methods as RouteContext[];
      }
      get filters() {
            this.meta.filters ??= [];
            return this.meta.filters as FilterContext[];
      }
}
export class App {
      private static readonly injectable: Map<ArgClass<[]>, {}> = new Map;
      public static readonly server: Server = new Server;

      public static inject<T>(constructor: ArgClass<[]>) {
            if (!this.injectable.has(constructor)) {
                  this.injectable.set(constructor, new constructor());
            }
            return this.injectable.get(constructor)! as T;
      }
}

export function controller() {
      return <T extends ArgClass<[]>>(constructor: T, ctx: ClassDecoratorContext) => {
            const instance = new constructor();
            const methods = new RestMetaContext(ctx.metadata).methods;
            const filters = new RestMetaContext(ctx.metadata).filters;

            for (const method of methods) {
                  const handler = (req: Request, res: Response) => method.handler.call(instance, req, res);

                  for (const httpMethod of method.methods) {
                        App.server.route(method.route, httpMethod, handler);
                  }
            }

            for (const filter of filters) {
                  const handler = (req: Request, res: Response, chain: FilterChain) => filter.handler.call(instance, req, res, chain);
                  App.server.filter(filter.pattern, handler);
            }
      }
}

type RouteConfig = { autoSend: boolean }
export function route<T>(route: string, methods: Method[] = ['GET'], config: Partial<RouteConfig> = {}) {
      return (method: (req: Request, res: Response) => T, ctx: ClassMethodDecoratorContext) => {
            async function handler(this: {}, req: Request, res: Response) {
                  let promise = method.call(this, req, res) as unknown;
                  while (promise && promise instanceof Promise) {
                        promise = await promise;
                  }
                  if ((typeof config.autoSend  != 'boolean' || config.autoSend) && promise && typeof promise == 'string') {
                        res.send(promise, 200);
                  }
                  res.end();
            }
            new RestMetaContext(ctx.metadata).methods.push({ handler, methods, route })
      }
}
export function event<T>(route: string, methods: Method[] = ['GET'], config: Partial<RouteConfig> = {}) {
      return (method: (req: Request, res: Response) => T, ctx: ClassMethodDecoratorContext) => {
            async function handler(this: {}, req: Request, res: Response) {
                  res.setHeader('Content-Type', 'text/event-stream');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Connection', 'keep-alive');
                  res.setHeader('X-Accel-Buffering', 'no');
                  let promise = method.call(this, req, res) as unknown;
                  while (promise && promise instanceof Promise) {
                        promise = await promise;
                  }
                  if ((typeof config.autoSend  != 'boolean' || config.autoSend) && promise && typeof promise == 'string') {
                        res.send(promise, 200);
                  }
            }
            new RestMetaContext(ctx.metadata).methods.push({ handler, methods, route })
      }
}

export function header<T>(key: string, value: string | string[]) {
      return (method: (req: Request, res: Response) => T) => {
            return function (this: {}, req: Request, res: Response) {
                  res.setHeader(key, value);
                  return method.call(this, req, res);
            }
      }     
}
export function filter<T>(pattern: string) {
      return (handler: FilterHandler, ctx: ClassMethodDecoratorContext) => {
            new RestMetaContext(ctx.metadata).filters.push({ handler, pattern })
      }
}
