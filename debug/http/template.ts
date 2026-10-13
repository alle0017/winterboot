export type Component<T> = (props: Record<string, unknown>, ...children: T[]) => T

interface Renderer<T> {
      render(tag: string, props: Record<string, unknown>, ...children: T[]): T
}

class TemplateRenderer implements Renderer<string> {
      public render(tag: string, props: Record<string, unknown>, ...children: string[]): string {
            const attrs = Object.entries(props).map(([k,v]) => typeof v == 'boolean' && v ? k: `${k}="${v}"`).join(' ')
            if (children.length <= 0) {
                  return `<${tag} ${attrs}/>`;
            }
            return `<${tag} ${attrs}>${children.join('')}</${tag}>`;
      }
}

class HtmlTemplate<T> {
      private readonly cache: Map<string, Component<T>> = new Map;
      public readonly tags: Record<string, Component<T>>;

      constructor(private readonly renderer: Renderer<T>) {
            this.tags = new Proxy({}, {
                  get: (_, key: string | symbol) => {
                        const tag = key.toString();
                        if (!this.cache.has(tag)) {
                              this.cache.set(tag, (props: Record<string, unknown>, ...children: T[]) => this.renderer.render(tag, props, ...children));
                        }
                        return this.cache.get(tag)!;
                  }
            })
      }
}

export class Html {
      private static readonly instance: HtmlTemplate<string> = new HtmlTemplate(new TemplateRenderer());

      public static tags() {
            return this.instance.tags;
      }
}