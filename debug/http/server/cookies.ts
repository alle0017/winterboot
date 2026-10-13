import { type OutgoingHttpHeaders } from "node:http";

export class CookieParser {
      constructor(private readonly cookie: string) {} 

      public parse() {
            const cookies: Record<string,string> = {};
            for (let start = 0; start < this.cookie.length; start++) {
                  let key = '';
                  let value = '';
      
                  while (start < this.cookie.length && this.cookie[start] != '=') {
                        key += this.cookie[start];
                        start++;
                  }
                  start++;
                  let terminator = ';';
                  if (this.cookie[start] == '"') {
                        terminator = '"';
                        start++;
                  }
                  while (start < this.cookie.length && this.cookie[start] != terminator) {
                        value += this.cookie[start];
                        start++;
                  }
                  if (terminator == '"') {
                        start++;
                  }
                  if (cookies[key]) {
                        continue;
                  }
                  try {
                        value = decodeURIComponent(value)
                  } finally {
                        cookies[key] = value;
                  }
            }
            return cookies;
      }
}

type CookieOpt = { 
      maxAge: number; 
      path: string; 
      httpOnly: boolean; 
      secure: boolean; 
      sameSite: 'Strict' | 'Lax' | 'None' 
}

export class Cookie {
      constructor(public readonly name: string, public value: string, public readonly opts: Partial<CookieOpt>) {}

      public toString() {
            let c = `${this.name}=${encodeURIComponent(this.value)}; Path=${this.opts.path ?? '/'}`;
            
            if (this.opts.maxAge !== undefined) {
                  c += `; Max-Age=${this.opts.maxAge}`;
            }
            if (this.opts.httpOnly ?? true) {
                  c += '; HttpOnly';
            }
            if (this.opts.secure) {
                  c += '; Secure';
            }
            c += `; SameSite=${this.opts.sameSite ?? 'Lax'}`;
            return c;
      }
}
export class CookieEncoder {
      private readonly cookies: Map<string, Cookie> = new Map;

      public getOrCreate(name: string) {
            return this.cookies.getOrInsertComputed(name, () => new Cookie(name, '', {}));
      }
      public setHeader(headers: OutgoingHttpHeaders) {
            const cookies = this.cookies.values().map(c => c.toString()).toArray().join(';');
            const prev = headers['Set-Cookie'];
            const old = prev ? [String(prev)] : [];
            const list = Array.isArray(prev) ? prev : old;
            headers['Set-Cookie'] = [...list, cookies];
      }
}