// Browser-side data access: the same snapshot files, served by the CDN next to the pages.
export function dataUrl(file: string): string {
  return `/data/${file}`;
}

const memo = new Map<string, Promise<unknown>>();

export function loadJson<T>(file: string): Promise<T> {
  if (!memo.has(file)) {
    memo.set(file, fetch(dataUrl(file)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`);
      return r.json();
    }));
  }
  return memo.get(file) as Promise<T>;
}
