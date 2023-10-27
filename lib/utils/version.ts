type Version = { epoch: number; upstream: string; debian: string };

const Version = function (v: string) {
  let versionResult = /^[a-zA-Z]?([0-9]*(?=:))?:(.*)/.exec(v);
  let version = versionResult && versionResult[2] ? versionResult[2] : v;
  let versionParts = version.split("-");

  this.epoch = versionResult ? Number(versionResult[1]) : 0;
  this.debian = versionParts.length > 1 ? versionParts.pop() : "";
  this.upstream = versionParts.join("-");
};

Version.prototype.compare = function (b: Version) {
  if ((this.epoch > 0 || b.epoch > 0) && Math.sign(this.epoch - b.epoch) !== 0) {
    return Math.sign(this.epoch - b.epoch);
  }
  if (this.compareStrings(this.upstream, b.upstream) !== 0) {
    return this.compareStrings(this.upstream, b.upstream);
  }
  return this.compareStrings(this.debian, b.debian);
};

Version.prototype.charCode = function (c: string) {
  // the lower the character code the lower the version.
  // if (c === '~') {return 0;} // tilde sort before anything
  // else
  if (/[a-zA-Z]/.test(c)) {
    return c.charCodeAt(0) - "A".charCodeAt(0) + 1;
  } else if (/[.:+-:]/.test(c)) {
    return c.charCodeAt(0) + "z".charCodeAt(0) + 1;
  } // char codes are 46..58
  return 0;
};

// find index in "array" by "fn" callback.
Version.prototype.findIndex = function (array: string[], fn: (c: string, i: number) => boolean) {
  for (let i = 0; i < array.length; i++) {
    if (fn(array[i], i)) {
      return i;
    }
  }
  return -1;
};

Version.prototype.compareChunk = function (a: string, b: string) {
  let ca = a.split("");
  let cb = b.split("");
  let diff = this.findIndex(ca, function (c: string, index: number) {
    return !(cb[index] && c === cb[index]);
  });
  if (diff === -1) {
    if (cb.length > ca.length) {
      if (cb[ca.length] === "~") {
        return 1;
      }
      return -1;
    }
    return 0; // no diff found and same length
  } else if (!cb[diff]) {
    return ca[diff] === "~" ? -1 : 1;
  }
  return this.charCode(ca[diff]) > this.charCode(cb[diff]) ? 1 : -1;
};

Version.prototype.compareStrings = function (a: string, b: string) {
  if (a === b) {
    return 0;
  }
  let parseA = /([^0-9]+|[0-9]+)/g;
  let parseB = /([^0-9]+|[0-9]+)/g;
  let ra = parseA.exec(a);
  let rb = parseB.exec(b);
  while (ra !== null && rb !== null) {
    if ((isNaN(Number(ra[1])) || isNaN(Number(rb[1]))) && ra[1] !== rb[1]) {
      // a or b is not a number and they're not equal. Note : "" IS a number so both null is impossible
      return this.compareChunk(ra[1], rb[1]);
    } // both are numbers
    if (ra[1] !== rb[1]) {
      return parseInt(ra[1], 10) > parseInt(rb[1], 10) ? 1 : -1;
    }
    ra = parseA.exec(a);
    rb = parseB.exec(b);
  }
  if (!ra && rb) {
    // rb doesn't get exec-ed when ra == null
    return rb.length > 0 && rb[1].split("")[0] === "~" ? 1 : -1;
  } else if (ra && !rb) {
    return ra[1].split("")[0] === "~" ? -1 : 1;
  }
  return 0;
};

export const compare = (a: any[], b: any[]) => {
  let va = new Version(a[0]);
  let vb = new Version(b[0]);
  return vb.compare(va);
};
