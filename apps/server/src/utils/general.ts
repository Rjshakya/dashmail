type OnSuccess<T> =
  | ((params: any, res: T) => void)
  | ((params: any, res: T) => Promise<void>);
type OnError =
  | ((error: unknown, params: any) => void)
  | ((error: unknown, params: any) => Promise<void>);

export const execAsync = async <T>(
  name: string,
  callBack: (params?: any) => Promise<T>,
  params?: any,
  onSuccess?: OnSuccess<T>,
  onError?: OnError
): Promise<T> => {
  try {
    const res = await Promise.resolve(callBack(params));
    const success = await onSuccess?.(params, res);
    return res;
  } catch (e) {
    await onError?.(e, params);
    console.error(`[${name}]:error`, e, ` with params:${params}`);
    throw new Error(`failed to execute ${name} , params:${params}`);
  }
};
