declare module 'react' {
  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;

  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;

  export function useState<S>(initialState: S): [S, Dispatch<SetStateAction<S>>];
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: unknown): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number;
  }

  interface IntrinsicElements {
    main: any;
    div: any;
    header: any;
    section: any;
    article: any;
    h1: any;
    h2: any;
    p: any;
    strong: any;
    span: any;
  }
}
