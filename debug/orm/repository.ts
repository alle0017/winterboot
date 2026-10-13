import { DatabaseSync, type DatabaseSyncOptions, type SQLOutputValue } from "node:sqlite";
abstract class Repository<T> {
      protected declare readonly _: T;
}

class QueryMeta {
      constructor(private readonly metadata: DecoratorMetadataObject) {}

      queries() {
            this.metadata.queries ??= new Map
            return this.metadata.queries as Map<string, string>
      }
      actions() {
            this.metadata.actions ??= new Map
            return this.metadata.actions as Map<string, string>
      }
}
export type DatabaseSettings = {
      database: string | Buffer | URL, 
      options?: DatabaseSyncOptions
}

function map<T extends {}>(rows: Record<string, SQLOutputValue>[], entity: ArgClass<[], T>) {
      return rows.map(row => {
            const instance = new entity;

            for (const [k,v] of Object.entries(row)) {
                  if (k in instance) {
                        //@ts-ignore
                        instance[k] = v;
                  }
            }
            return instance;
      })
}


export class Datasource {
      private static readonly sources: Map<string, DatabaseSync> = new Map;
      public static addDatasource(key: string, config: DatabaseSettings) {
            const db = new DatabaseSync(config.database, config.options)
            this.sources.set(key, db);
      }
      public static getSource(key: string) {
            if (!this.sources.has(key)) {
                  throw new Error(`found invalid data source: ${key}`);
            }
            return this.sources.get(key)!;
      }
}
export function repository<K extends {}>(entity: ArgClass<[], K>, source: string) {
      return <T extends Class<Repository<K>>>(constructor: T, ctx: ClassDecoratorContext) => {
            const db = Datasource.getSource(source);
            const queries = new QueryMeta(ctx.metadata).queries();
            const actions = new QueryMeta(ctx.metadata).actions();

            return class extends constructor {
                  constructor(...args: any[]) {
                        super(...args)
                        for (const [method, query] of queries.entries()) {
                              //@ts-expect-error
                              this[method] = (...args: any[]) =>  map(db.prepare(query).all(...args), entity);
                        }
                        for (const [method, query] of actions.entries()) {
                              //@ts-expect-error
                              this[method as keyof T] = ((...args: any[]) =>  db.prepare(query).run());
                        }
                  }
            }
      }
}
export function query<A extends any[], K, T extends Repository<K>>(sql: string) {
      return (method: (...args: A) => K[], ctx: ClassMethodDecoratorContext<T>) => {
            new QueryMeta(ctx.metadata).queries().set(method.name, sql);
      }
}
export function action<A extends any[]>(sql: string) {
      return (method: (...args: A) => void, ctx: ClassMethodDecoratorContext) => {
            new QueryMeta(ctx.metadata).actions().set(method.name, sql);
      }
}