import { flow, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { failure } from "io-ts/PathReporter";
import { getTE } from "./persistence/store.local-ifpts";

// just a quick way to simplify the error types for this example
const ValidationErrorsToError = flow(
  failure,
  (es) => es.join("\n"),
  (err) => new Error(err)
);

const HabitC = t.strict({
  id: t.string,
  name: t.string,
  createdAt: t.string, //you can get a date codec, it's just not in default package.
});

type Habit = t.TypeOf<typeof HabitC>;

const HabitIdsC = t.union([t.readonlyArray(t.string), t.null]);

const habitIdsKey = "habit-ids";

const getHabitIdsFromStore = (): TE.TaskEither<Error, ReadonlyArray<string>> =>
  pipe(
    getTE(habitIdsKey),
    HabitIdsC.decode,
    TE.fromEither,
    // convert nothing (null) in store to empty array
    TE.map((result) => result ?? []),
    TE.mapLeft(ValidationErrorsToError)
  );

// just a quick example of a debug util, obv. there are libs and easy to write your own
function logValue<E, A>(msg: string) {
  return TE.chainFirst<E, A, null>((val) => {
    console.log(msg);
    console.log(val);
    return TE.of(null);
  });
}

const getHabitFromStore = (id: string) =>
  pipe(
    // kind of ignored the idea of having a `habit-` prefix.
    // I think you can handle that when you save the habit to the store
    id,
    getTE,
    // just an example of how you can get debug info to the console.
    logValue(`value stored in ${id}:`),
    // convert nothing in store (null) to an error.  If your habit id is 
    // not found, most likely your store is corrupt.
    TE.chain((maybeHabit) =>
      maybeHabit
        ? TE.right(maybeHabit)
        : TE.left(new Error(`No habit found with id: ${id}`))
    ),
    TE.chain(
      flow(
        HabitC.decode,
        TE.fromEither,
        TE.mapLeft(ValidationErrorsToError)
      )
    )
  );

// Leaving the return type as TaskEither, as that is what composes.
// Original returns a Promise.  Consuming the TaskEither is not hard,
// but out of scope.
export const findAll = () =>
  pipe(
    getHabitIdsFromStore(),
    // If we got ids back (chain), traverse that array
    // of ids with a function that returns TE<Error, Habit> which is
    // is transformed into TE<Error, ReadonlyArray<Habit>>
    TE.chain(TE.traverseArray(getHabitFromStore))
    // In original you handle error as below, but I think it is the
    // wrong place in this design.  In this verion, this only happens
    // if local storage blew up or is corrupt somehow.  If the store
    // _is just empty_, you would get an empty array, with this
    // approach.  But you can suppress all errors by uncommenting this line.
    // TE.orElse(() => TE.of([] as ReadonlyArray<Habit>))
  );