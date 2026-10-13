import type { Request, Response } from '../debug/http/server/communication.ts';

export namespace state {
      class State {
            private static hashKey: number = 0;
            private static encryptKey: number = 0;


            public static useKey(secret: string) {
                  const buffer = new TextEncoder().encode(secret);

                  for (const key of buffer) {
                        this.hashKey += key;
                        this.encryptKey ^= key;
                  }
            }

            public static encode(payload: {}) {
                  const jwt = JSON.stringify(payload);
                  return jwt;
            }

            public static decode(token: string) {
                  try {
                        return JSON.parse(token);
                  } catch (error) {
                        throw new Error(`invalid jwt token ${error}`)
                  }
            }
      }

      export function config(secret: string) {
            return <T extends Class>(constructor: T) => {
                  State.useKey(secret);
            }
      }

      export function get<T extends {}>(name: string, req: Request) {
            return State.decode(req.cookies[name] ?? '') as T;
      }

      export function getOrDefault<T extends {}>(name: string, req: Request, value: T) {
            if (!req.cookies[name]) {
                  return value;
            }
            try {
                  return State.decode(req.cookies[name]) as T;
            } catch (error) { 
                  return value;
            }
      }
      export function set(name: string, value: {}, res: Response) {
            res.cookies.getOrCreate(name).value = State.encode(value);
      }
}