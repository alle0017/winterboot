type Config = {
      port: number
      debug: boolean
}
export class Debug {
      private static debug = false;

      public static useDebugMode() {
            this.debug = true;
      }
      public static isDebugMode() {
            return this.debug;
      }
}


export function mock<T extends {}, M extends T>(mocked: (...args: any[]) => M) {
      return (constructor: Class<T>) => {
            if (Debug.isDebugMode()) {
                  return new Proxy(constructor, {
                        construct(original, ...args: any[]) {
                              return mocked(...args);
                        }
                  });
            }
            return constructor;
      }
}
export async function defineConfig(base: string, entries: string[], config: Partial<Config>) {
      if (config.debug) {
            Debug.useDebugMode();
      }
      await Promise.all(entries.map(v => import(new URL(v, base).href)));
}