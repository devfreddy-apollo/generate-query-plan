/**
 * Use this utility to ensure exhaustive conditions when working with locally defined types.
 * If the type is from graphql, consider using assertUnreachableOrReturnDefault
 * instead to prevent throwing errors in prod
 */
export declare function assertUnreachable(x: never): never;
/**
 * Use this utility to ensure exhaustive conditions when working with graphql defined types.
 * This will guarantee we update the code when the schema changes, but prevent errors
 * from being throw in prod
 *
 * Note: The default value will not be type checked, so make sure the value is appropriate.
 */
export declare function assertUnreachableOrReturnDefault<DefaultValue>(unreachableValue: never, defaultValue: DefaultValue): DefaultValue;
