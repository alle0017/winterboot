import { Html, http, app } from "./debug/index.ts";
import { state } from "./state/index.ts";

const { div, html, body, head, title, form, input, button, script } = Html.tags();


@http.controller()
export class Controller {
      @http.route('/')
      public home(req: http.Request, res: http.Response) {
            const name = 'STATE';
            const { x } = state.getOrDefault(name, req, { x: 0 });
            state.set(name, { x: x + 1 }, res);

            console.log(req.cookies)

            return html({},
                  head({}, title({}, 'main')),
                  body({},
                        `${x}`
                  )
            )
      }
}

@app.server(8080)
class App { }