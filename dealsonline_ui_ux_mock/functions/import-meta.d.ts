// Shared app modules (src/app/lib/demoSource.ts) read `import.meta.env?.…`,
// which Vite defines in the browser build and the Workers runtime does not.
interface ImportMeta {
  readonly env?: Record<string, string | undefined>;
}
