export function get(url: string): Promise<string> {
  return fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText || `HTTP ${res.status}`);
    }
    return res.text();
  });
}

export function getJSON<T = unknown>(url: string): Promise<T> {
  return fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText || `HTTP ${res.status}`);
    }
    return res.json();
  });
}
