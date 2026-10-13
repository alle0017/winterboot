type ArgClass<A extends unknown[], T = {}> = new(...args: A) => T
type Class<T = {}> = new(...args: any[]) => T