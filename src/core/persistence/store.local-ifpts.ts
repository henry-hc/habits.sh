import * as TE from "fp-ts/lib/TaskEither";

// I am assuming that the wrapping of localStorage calls in a Promise is
// to make this an example of async coding?  In any case, just kept that as is.
const localStorageP = {
  async getItem(key: string) {
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    return localStorage.setItem(key, value);
  },
};

export const getTE = (key: string) =>
  TE.tryCatch(
    // I don't typically find much value in the Maybe (Option in fp-ts)
    // monand in modern TS. I leave it to the consumer to decide if
    // null coming back is an error or whatever.
    () => localStorageP.getItem(key),
    (err) => new Error(`Error in LocalStorage.get: ${err}`)
  );
export const setTE = (key: string, value: string) =>
  TE.tryCatch(
    () => localStorageP.setItem(key, value),
    (err) => new Error(`Error in LocalStorage.set: ${err}`)
  );
