function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function randomInt(min: number, max: number) {
  const range = max - min;
  if (range <= 0) return min;

  const bytes = randomBytes(4);
  const value = new DataView(bytes.buffer).getUint32(0);
  return min + (value % range);
}

export default {
  randomBytes,
  randomInt,
};
