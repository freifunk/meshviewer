export const hasOwn = function hasOwn(dict: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(dict, key);
};
