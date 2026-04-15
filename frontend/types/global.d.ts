declare type Recordable<T = any> = Record<string, T>;
declare type ReadonlyRecordable<T = any> = Readonly<Record<string, T>>;

declare type TimeoutHandle = ReturnType<typeof setTimeout>;
declare type IntervalHandle = ReturnType<typeof setInterval>;

declare type GetArrayItem<T> = NonNullable<T>[number];

declare type RequireKey<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
declare type PartialKey<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
