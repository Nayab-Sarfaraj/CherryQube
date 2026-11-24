/**
 * Polyfill for window.crypto.subtle.digest in insecure contexts (such as
 * Android WebView accessing development hosts via http://10.0.2.2:3000).
 *
 * In non-secure contexts, browsers disable SubtleCrypto per the W3C spec,
 * which causes Clerk's client SDK to crash during cookie initialization with:
 * "Cannot read properties of undefined (reading 'digest')".
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function rotl(n: number, s: number): number {
  return (n << s) | (n >>> (32 - s));
}

function toBytes(data: unknown): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  return new Uint8Array(0);
}

export function computeSha256Buffer(data: unknown): ArrayBuffer {
  const bytes = toBytes(data);
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number;
  let j: number;
  const words: number[] = [];
  const bitLength = bytes.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  for (i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
  }
  words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length % 4)) * 8);

  const totalWords = (((bytes.length + 8) >> 6) + 1) * 16;
  while (words.length < totalWords) words.push(0);
  words[totalWords - 2] = Math.floor(bitLength / maxWord);
  words[totalWords - 1] = bitLength | 0;

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice();
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i] | 0
            : ((w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0));
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);
  for (i = 0; i < 8; i++) view.setUint32(i * 4, hash[i] >>> 0, false);
  return buffer;
}

export function computeSha1Buffer(data: unknown): ArrayBuffer {
  const bytes = toBytes(data);
  const bitLen = bytes.length * 8;
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
  }
  words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length % 4)) * 8);

  const totalWords = (((bytes.length + 8) >> 6) + 1) * 16;
  while (words.length < totalWords) words.push(0);
  words[totalWords - 2] = Math.floor(bitLen / Math.pow(2, 32));
  words[totalWords - 1] = bitLen | 0;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let j = 0; j < words.length; j += 16) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) w[i] = words[j + i];
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const buf = new ArrayBuffer(20);
  const view = new DataView(buf);
  view.setUint32(0, h0 >>> 0, false);
  view.setUint32(4, h1 >>> 0, false);
  view.setUint32(8, h2 >>> 0, false);
  view.setUint32(12, h3 >>> 0, false);
  view.setUint32(16, h4 >>> 0, false);
  return buf;
}

export function installCryptoSubtlePolyfill(target: {
  crypto?: { subtle?: { digest?: unknown } };
}): void {
  if (!target.crypto) {
    target.crypto = {};
  }
  if (!target.crypto.subtle) {
    target.crypto.subtle = {
      digest(algorithm: unknown, data: unknown): Promise<ArrayBuffer> {
        const raw =
          typeof algorithm === "string"
            ? algorithm
            : (algorithm as { name?: string })?.name;
        const normalized = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (normalized === "SHA256") {
          return Promise.resolve(computeSha256Buffer(data));
        }
        if (normalized === "SHA1") {
          return Promise.resolve(computeSha1Buffer(data));
        }
        return Promise.reject(
          new Error(`Unsupported digest algorithm: ${String(raw)}`),
        );
      },
    };
  }
}

/**
 * Inline script tag content to run before external scripts execute.
 */
export const CRYPTO_SUBTLE_POLYFILL_SCRIPT = `(function(){
  if (typeof window === "undefined") return;
  if (!window.crypto) window.crypto = {};
  if (!window.crypto.subtle) {
    function toBytes(data) {
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      if (typeof data === "string") return new TextEncoder().encode(data);
      return new Uint8Array(0);
    }
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
    function sha256(data) {
      var bytes = toBytes(data);
      var max = Math.pow(2, 32), words = [], bitLen = bytes.length * 8, hash = [], k = [], prime = 0, comp = {};
      for (var c = 2; prime < 64; c++) {
        if (!comp[c]) {
          for (var i = 0; i < 313; i += c) comp[i] = c;
          hash[prime] = (Math.pow(c, 0.5) * max) | 0;
          k[prime++] = (Math.pow(c, 1 / 3) * max) | 0;
        }
      }
      for (var i = 0; i < bytes.length; i++) words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
      words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length % 4)) * 8);
      var total = (((bytes.length + 8) >> 6) + 1) * 16;
      while (words.length < total) words.push(0);
      words[total - 2] = Math.floor(bitLen / max);
      words[total - 1] = bitLen | 0;
      for (var j = 0; j < words.length; j += 16) {
        var w = words.slice(j, j + 16), old = hash.slice();
        for (var i = 0; i < 64; i++) {
          var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
          var t1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
            ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
            (w[i] = i < 16 ? w[i] | 0 : ((w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0));
          var t2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
            ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(t1 + t2) | 0].concat(hash.slice(0, 7));
          hash[4] = (hash[4] + t1) | 0;
        }
        for (var i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
      }
      var buf = new ArrayBuffer(32), view = new DataView(buf);
      for (var i = 0; i < 8; i++) view.setUint32(i * 4, hash[i] >>> 0, false);
      return buf;
    }
    function sha1(data) {
      var bytes = toBytes(data);
      var bitLen = bytes.length * 8, words = [];
      for (var i = 0; i < bytes.length; i++) words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
      words[bytes.length >> 2] |= 0x80 << ((3 - (bytes.length % 4)) * 8);
      var total = (((bytes.length + 8) >> 6) + 1) * 16;
      while (words.length < total) words.push(0);
      words[total - 2] = Math.floor(bitLen / Math.pow(2, 32));
      words[total - 1] = bitLen | 0;
      var h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
      for (var j = 0; j < words.length; j += 16) {
        var w = new Array(80);
        for (var i = 0; i < 16; i++) w[i] = words[j + i];
        for (var i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        var a = h0, b = h1, c = h2, d = h3, e = h4;
        for (var i = 0; i < 80; i++) {
          var f, k;
          if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
          else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
          else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
          else { f = b ^ c ^ d; k = 0xca62c1d6; }
          var temp = (rotl(a, 5) + f + e + k + w[i]) | 0;
          e = d; d = c; c = rotl(b, 30); b = a; a = temp;
        }
        h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
      }
      var buf = new ArrayBuffer(20), view = new DataView(buf);
      view.setUint32(0, h0 >>> 0, false);
      view.setUint32(4, h1 >>> 0, false);
      view.setUint32(8, h2 >>> 0, false);
      view.setUint32(12, h3 >>> 0, false);
      view.setUint32(16, h4 >>> 0, false);
      return buf;
    }
    window.crypto.subtle = {
      digest: function(algorithm, data) {
        var raw = typeof algorithm === "string" ? algorithm : (algorithm && algorithm.name);
        var name = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (name === "SHA256") return Promise.resolve(sha256(data));
        if (name === "SHA1") return Promise.resolve(sha1(data));
        return Promise.reject(new Error("Unsupported digest algorithm: " + raw));
      }
    };
  }
})();`;
