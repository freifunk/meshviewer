type VersionLike = { epoch: number; upstream: string; debian: string };

export class Version implements VersionLike {
  epoch: number;
  debian: string;
  upstream: string;

  constructor(v: string) {
    if (v.startsWith("v") || v.startsWith("V")) {
      v = v.slice(1);
    }
    const versionResult = /^[a-zA-Z]?([0-9]*(?=:))?:(.*)/.exec(v);
    const version = versionResult && versionResult[2] ? versionResult[2] : v;
    const versionParts = version.split("-");

    this.epoch = versionResult ? Number(versionResult[1]) : 0;
    this.debian = versionParts.length > 1 ? versionParts.pop()! : "";
    this.upstream = versionParts.join("-");
  }

  compare(b: VersionLike) {
    if ((this.epoch > 0 || b.epoch > 0) && Math.sign(this.epoch - b.epoch) !== 0) {
      return Math.sign(this.epoch - b.epoch);
    }
    if (this.compareStrings(this.upstream, b.upstream) !== 0) {
      return this.compareStrings(this.upstream, b.upstream);
    }
    return this.compareStrings(this.debian, b.debian);
  }

  charCode(c: string) {
    if (/[a-zA-Z]/.test(c)) {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 1;
    } else if (/[.:+-:]/.test(c)) {
      return c.charCodeAt(0) + "z".charCodeAt(0) + 1;
    }
    return 0;
  }

  findIndex(array: string[], fn: (c: string, i: number) => boolean) {
    for (let i = 0; i < array.length; i++) {
      if (fn(array[i], i)) {
        return i;
      }
    }
    return -1;
  }

  compareChunk(a: string, b: string) {
    const ca = a.split("");
    const cb = b.split("");
    const diff = this.findIndex(ca, function (c: string, index: number) {
      return !(cb[index] && c === cb[index]);
    });
    if (diff === -1) {
      if (cb.length > ca.length) {
        if (cb[ca.length] === "~") {
          return 1;
        }
        return -1;
      }
      return 0;
    } else if (!cb[diff]) {
      return ca[diff] === "~" ? -1 : 1;
    }
    return this.charCode(ca[diff]) > this.charCode(cb[diff]) ? 1 : -1;
  }

  compareStrings(a: string, b: string) {
    if (a === b) {
      return 0;
    }
    const parseA = /([^0-9]+|[0-9]+)/g;
    const parseB = /([^0-9]+|[0-9]+)/g;
    let ra = parseA.exec(a);
    let rb = parseB.exec(b);
    while (ra !== null && rb !== null) {
      if ((isNaN(Number(ra[1])) || isNaN(Number(rb[1]))) && ra[1] !== rb[1]) {
        return this.compareChunk(ra[1], rb[1]);
      }
      if (ra[1] !== rb[1]) {
        return parseInt(ra[1], 10) > parseInt(rb[1], 10) ? 1 : -1;
      }
      ra = parseA.exec(a);
      rb = parseB.exec(b);
    }
    if (!ra && rb) {
      return rb.length > 0 && rb[1].split("")[0] === "~" ? 1 : -1;
    } else if (ra && !rb) {
      return ra[1].split("")[0] === "~" ? -1 : 1;
    }
    return 0;
  }
}

export const compare = (a: string, b: string) => {
  const va = new Version(a);
  const vb = new Version(b);
  return vb.compare(va);
};
