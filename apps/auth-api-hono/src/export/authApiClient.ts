import type { AuthAppType } from '../index'
import { hc } from 'hono/client'
import type { InferRequestType, InferResponseType } from 'hono/client'

export const createAuthApiClient = (baseUrl: string = '/__p_auth/') => {
    const calculatedApiClient = hc<AuthAppType>(baseUrl)
    type typeFromCalculated = typeof calculatedApiClient;
    const hcWithType = (...args: Parameters<typeof hc>): typeFromCalculated =>
        hc<AuthAppType>(...args)
    return hcWithType(baseUrl, {})
}

export type ReqType<T> = InferRequestType<T>;
export type ResType<T> = InferResponseType<T>;
export type User = ResType<Awaited<ReturnType<typeof createAuthApiClient>['api']['user']['whoami']['$post']>>['data'];
