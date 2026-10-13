import { DatabaseSettings, Datasource } from './orm/repository.ts';
export { query, repository, action } from './orm/repository.ts';
export { Html } from './http/template.ts';
import * as http from "./http/index.ts";
export {http};

export namespace app {
      export function datasource(key: string, settings: DatabaseSettings) {
            return <T extends Class>(constructor: T) => {
                  Datasource.addDatasource(key, settings);
            }
      }
      export function server(port: number) {
            return <T extends Class>(constructor: T) => {
                  http.App.server.execute(port);
            }
      }
} 