// @see https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
/**
 * Use this utility to ensure exhaustive conditions when working with locally defined types.
 * If the type is from graphql, consider using assertUnreachableOrReturnDefault
 * instead to prevent throwing errors in prod
 */
export function assertUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here ${JSON.stringify(x)}`);
}

/**
 * Use this utility to ensure exhaustive conditions when working with graphql defined types.
 * This will guarantee we update the code when the schema changes, but prevent errors
 * from being throw in prod
 *
 * Note: The default value will not be type checked, so make sure the value is appropriate.
 */
export function assertUnreachableOrReturnDefault<DefaultValue>(
  unreachableValue: never,
  defaultValue: DefaultValue
): DefaultValue {
  if (process.env.NODE_ENV !== "production") {
    assertUnreachable(unreachableValue);
  } else {
    console.error(
      new Error(
        `Unreachable value ${JSON.stringify(
          unreachableValue
        )}, didn't expect to get here`
      )
    );
    return defaultValue;
  }
}
