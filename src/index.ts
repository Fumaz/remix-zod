import {z as zod, ZodType, ZodUnknown} from "zod";
import {json, Params} from "@remix-run/react";
import {ActionFunctionArgs, Cookie, LoaderFunctionArgs} from "@remix-run/node";

const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
let debug = false;

export const zx = Object.assign({
    file: ({
               minimumSize,
               maximumSize,
               mimetype
           }: {
        minimumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        maximumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        mimetype?: string | string[];
    } = {}) => zod.custom<File>((val => {
        if (!(val instanceof File)) {
            return false;
        }

        if (mimetype) {
            if (Array.isArray(mimetype)) {
                if (!mimetype.includes(val.type)) {
                    return false;
                }
            } else if (val.type !== mimetype) {
                return false;
            }
        }

        if (minimumSize) {
            if (val.size < convertToBytes(minimumSize)) {
                return false;
            }
        }

        if (maximumSize) {
            if (val.size > convertToBytes(maximumSize)) {
                return false;
            }
        }

        return true;
    })),
    files: ({
                minimumSize,
                maximumSize,
                mimetype
            }: {
        minimumFiles?: number;
        maximumFiles?: number;
        minimumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        maximumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        mimetype?: string | string[];
    } = {}) => zod.array(zx.file({
        minimumSize,
        maximumSize,
        mimetype
    })),
    base64: zod.string().refine(val => {
        if (val.startsWith('data:')) {
            val = val.split(',')[1];
        }

        try {
            atob(val);
            return true;
        } catch (error) {
            return false;
        }
    }),
    base64File: ({
                     minimumSize,
                     maximumSize,
                     mimetype
                 }: {
        minimumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        maximumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        mimetype?: string | string[];
    } = {}) => zod.preprocess<ReturnType<typeof zx.file>>((val) => {
        if (val instanceof File) {
            return val;
        }

        if (typeof val !== 'string') {
            throw new Error('Value must be a string');
        }

        const byteString = atob(val.split(',')[1]);
        const mimeString = val.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        const extension = mimeString.split('/')[1];
        const blob = new Blob([ab], {type: mimeString});

        return new File([blob], `file.${extension}`, {type: mimeString});
    }, zx.file({
        minimumSize,
        maximumSize,
        mimetype
    })),
    base64Files: ({
                      minimumSize,
                      maximumSize,
                      mimetype
                  }: {
        minimumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        maximumSize?: {
            value: number;
            unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
        };
        mimetype?: string | string[];
    } = {}) => zod.array(zx.base64File({
        minimumSize,
        maximumSize,
        mimetype
    })),
    stringNumber: zod.string().refine(val => !isNaN(Number(val)), {
        message: 'Value must be a number'
    }).transform(val => Number(val)),
    stringBoolean: zod.string().refine(val => val === 'true' || val === 'false', {
        message: 'Value must be a boolean'
    }).transform(val => val === 'true'),
    action: zodAction,
    loader: zodLoader,
    parseJson: parseJson,
    parseJsonSafe: parseJsonSafe,
    parseJsonWithDefault: parseJsonWithDefault,
    parseForm: parseForm,
    parseFormSafe: parseFormSafe,
    parseFormWithDefault: parseFormWithDefault,
    parseBody: parseBody,
    parseBodySafe: parseBodySafe,
    parseBodyWithDefault: parseBodyWithDefault,
    parseParams: parseParams,
    parseParamsSafe: parseParamsSafe,
    parseParamsWithDefault: parseParamsWithDefault,
    parseQuery: parseQuery,
    parseQuerySafe: parseQuerySafe,
    parseQueryWithDefault: parseQueryWithDefault,
    parseHeaders: parseHeaders,
    parseHeadersSafe: parseHeadersSafe,
    parseHeadersWithDefault: parseHeadersWithDefault,
    cookie: createZodCookie,
    throwBadRequest: throwBadRequest,
    debug: (value: boolean) => debug = value
}, zod);

export let badRequestMessage = "Bad Request";
export let customBadRequestJson: (message: string) => any = (message) => message;

function throwBadRequest(): never {
    throw json(customBadRequestJson(badRequestMessage), {
        status: 400,
        statusText: badRequestMessage
    });
}

async function getBodyEncoding(request: Request) {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
        return 'json';
    }

    if (contentType?.includes('multipart/form-data')) {
        return 'form';
    }

    return 'text';
}

async function parseOrThrow<Schema extends ZodType>(schema: Schema, value: any): Promise<zod.infer<Schema>> {
    try {
        return await schema.parseAsync(value);
    } catch (error) {
        if (debug) {
            console.error(error);
        }

        throwBadRequest();
    }
}

export function convertToBytes(fileSize: {
    value: number;
    unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
}): number {
    const {
        value,
        unit
    } = fileSize;

    switch (unit) {
        case 'B':
            return value;
        case 'KB':
            return value * 1024;
        case 'MB':
            return value * 1024 * 1024;
        case 'GB':
            return value * 1024 * 1024 * 1024;
        case 'TB':
            return value * 1024 * 1024 * 1024 * 1024;
        default:
            throw new Error('Invalid file size unit.');
    }
}

export async function parseJson<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const body = await request.json();

    return await parseOrThrow(schema, body);
}

export async function parseJsonSafe<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const body = await request.json();

    return await schema.safeParseAsync(body);
}

export async function parseJsonWithDefault<Schema extends ZodType>(request: Request, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    const body = await request.json();

    return await schema.safeParseAsync(body).then(result => result.success ? result.data : defaultValue);
}

export function formToObject(form: FormData) {
    const data: Record<string, any> = {};

    form.forEach((value, key) => {
        if (data[key] !== undefined) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }

            data[key].push(value);
            return;
        }

        data[key] = value;
    });

    return data;
}

export async function parseForm<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const body = await request.formData();
    const data = formToObject(body);

    return await parseOrThrow(schema, data);
}

export async function parseFormSafe<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const body = await request.formData();
    const data = formToObject(body);

    return await schema.safeParseAsync(data);
}

export async function parseFormWithDefault<Schema extends ZodType>(request: Request, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    const body = await request.formData();
    const data = formToObject(body);

    return await schema.safeParseAsync(data).then(result => result.success ? result.data : defaultValue);
}

export async function parseBody<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJson(request, schema);
    }

    if (encoding === 'form') {
        return await parseForm(request, schema);
    }

    return throwBadRequest();
}

export async function parseBodySafe<Schema extends ZodType>(request: Request, schema: Schema): Promise<zod.infer<Schema>> {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJsonSafe(request, schema);
    }

    if (encoding === 'form') {
        return await parseFormSafe(request, schema);
    }

    return throwBadRequest();
}

export async function parseBodyWithDefault<Schema extends ZodType>(request: Request, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJsonWithDefault(request, schema, defaultValue);
    }

    if (encoding === 'form') {
        return await parseFormWithDefault(request, schema, defaultValue);
    }

    return throwBadRequest();
}

export async function parseParams<Schema extends ZodType>(params: Params<any>, schema: Schema): Promise<zod.infer<Schema>> {
    return await parseOrThrow(schema, params);
}

export async function parseParamsSafe<Schema extends ZodType>(params: Params<any>, schema: Schema): Promise<zod.infer<Schema>> {
    return await schema.safeParseAsync(params);
}

export async function parseParamsWithDefault<Schema extends ZodType>(params: Params<any>, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    return await schema.safeParseAsync(params).then(result => result.success ? result.data : defaultValue);
}

function searchParamsToObject(search: URLSearchParams) {
    const data: Record<string, any> = {};

    search.forEach((value, key) => {
        if (data[key] !== undefined) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }

            data[key].push(value);
            return;
        }

        data[key] = value;
    });

    return data;
}

export async function parseQuery<Schema extends ZodType>(request: Request | URLSearchParams, schema: Schema): Promise<zod.infer<Schema>> {
    if (request instanceof URLSearchParams) {
        return await parseOrThrow(schema, request);
    }

    const query = new URL(request.url).searchParams;
    const data = searchParamsToObject(query);

    return await parseOrThrow(schema, data);
}

export async function parseQuerySafe<Schema extends ZodType>(request: Request | URLSearchParams, schema: Schema): Promise<zod.infer<Schema>> {
    if (request instanceof URLSearchParams) {
        return await schema.safeParseAsync(request);
    }

    const query = new URL(request.url).searchParams;
    const data = searchParamsToObject(query);

    return await schema.safeParseAsync(data);
}

export async function parseQueryWithDefault<Schema extends ZodType>(request: Request | URLSearchParams, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    if (request instanceof URLSearchParams) {
        return await schema.safeParseAsync(request).then(result => result.success ? result.data : defaultValue);
    }

    const query = new URL(request.url).searchParams;
    const data = searchParamsToObject(query);

    return await schema.safeParseAsync(data).then(result => result.success ? result.data : defaultValue);
}

function headersToObject(headers: Headers) {
    const data: Record<string, any> = {};

    headers.forEach((value: any, key: any) => {
        if (data[key] !== undefined) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }

            data[key].push(value);
            return;
        }

        data[key] = value;
    });

    return data;
}

export async function parseHeaders<Schema extends ZodType>(headers: Headers, schema: Schema): Promise<zod.infer<Schema>> {
    return await parseOrThrow(schema, headersToObject(headers));
}

export async function parseHeadersSafe<Schema extends ZodType>(headers: Headers, schema: Schema): Promise<zod.infer<Schema>> {
    return await schema.safeParseAsync(headersToObject(headers));
}

export async function parseHeadersWithDefault<Schema extends ZodType>(headers: Headers, schema: Schema, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
    return await schema.safeParseAsync(headersToObject(headers)).then(result => result.success ? result.data : defaultValue);
}

export type ZodLoaderFunctionArgs<Params = unknown, Query = unknown> = LoaderFunctionArgs & {
    parsedParams: Params;
    parsedQuery: Query;
};

export type ZodActionFunctionArgs<Params = unknown, Body = unknown> = ActionFunctionArgs & {
    parsedParams: Params;
    parsedBody: Body;
};

type DataFunctionValue = Response | NonNullable<unknown> | null;

export type ZodLoaderFunction<Params = unknown, Query = unknown, Return extends DataFunctionValue = DataFunctionValue> = (args: ZodLoaderFunctionArgs<Params, Query>) => Promise<Return>;

export type ZodActionFunction<Params = unknown, Body = unknown, Return extends DataFunctionValue = DataFunctionValue> = (args: ZodActionFunctionArgs<Params, Body>) => Promise<Return>;

export function zodLoader<Params extends ZodType = ZodUnknown, Query extends ZodType = ZodUnknown, Return extends DataFunctionValue = DataFunctionValue>({
                                                                                                                                                             params = zod.unknown() as unknown as Params,
                                                                                                                                                             query = zod.unknown() as unknown as Query,
                                                                                                                                                         }: {
    params?: Params;
    query?: Query;
}, loader: ZodLoaderFunction<zod.infer<Params>, zod.infer<Query>, Return>) {
    return async (args: LoaderFunctionArgs): Promise<Return> => {
        return loader({
            ...args,
            parsedParams: await parseParams(args.params, params),
            parsedQuery: await parseQuery(args.request, query),
        });
    }
}

export function zodAction<Params extends ZodType = ZodUnknown, Body extends ZodType = ZodUnknown, Return extends DataFunctionValue = DataFunctionValue>({
                                                                                                                                                            params = zod.unknown() as unknown as Params,
                                                                                                                                                            body = zod.unknown() as unknown as Body
                                                                                                                                                        }: {
    params?: Params;
    body?: Body;
}, action: ZodActionFunction<zod.infer<Params>, zod.infer<Body>, Return>) {
    return async (args: ActionFunctionArgs): Promise<Return> => {
        return action({
            ...args,
            parsedParams: await parseParams(args.params, params),
            parsedBody: await parseBody(args.request, body)
        });
    }
}

export function createZodCookie<Schema extends ZodType>(cookie: Cookie, schema: Schema) {
    return Object.assign(cookie, {
        async parse(cookieHeader: string | null | Request | Headers): Promise<zod.infer<Schema>> {
            if (cookieHeader instanceof Request) {
                const headers = cookieHeader.headers.get('cookie');

                if (!headers) {
                    return await schema.parseAsync({});
                }

                return await schema.parseAsync(cookie.parse(headers));
            }

            if (cookieHeader instanceof Headers) {
                const headers = cookieHeader.get('cookie');

                if (!headers) {
                    return await schema.parseAsync({});
                }

                return await schema.parseAsync(cookie.parse(headers));
            }

            if (!cookieHeader) {
                return await schema.parseAsync({});
            }

            return await schema.parseAsync(cookie.parse(cookieHeader));
        },
        async parseSafe(cookieHeader: string | null | Request | Headers): Promise<zod.infer<Schema>> {
            if (cookieHeader instanceof Request) {
                const headers = cookieHeader.headers.get('cookie');

                if (!headers) {
                    return await schema.safeParseAsync({});
                }

                return await schema.safeParseAsync(cookie.parse(headers));
            }

            if (cookieHeader instanceof Headers) {
                const headers = cookieHeader.get('cookie');

                if (!headers) {
                    return await schema.safeParseAsync({});
                }

                return await schema.safeParseAsync(cookie.parse(headers));
            }

            if (!cookieHeader) {
                return await schema.safeParseAsync({});
            }

            return await schema.safeParseAsync(cookie.parse(cookieHeader));
        },
        async parseWithDefault(cookieHeader: string | null | Request | Headers, defaultValue: zod.infer<Schema>): Promise<zod.infer<Schema>> {
            if (cookieHeader instanceof Request) {
                const headers = cookieHeader.headers.get('cookie');

                if (!headers) {
                    return await schema.safeParseAsync({}).then(result => result.success ? result.data : defaultValue);
                }

                return await schema.safeParseAsync(cookie.parse(headers)).then(result => result.success ? result.data : defaultValue);
            }

            if (cookieHeader instanceof Headers) {
                const headers = cookieHeader.get('cookie');

                if (!headers) {
                    return await schema.safeParseAsync({}).then(result => result.success ? result.data : defaultValue);
                }

                return await schema.safeParseAsync(cookie.parse(headers)).then(result => result.success ? result.data : defaultValue);
            }

            if (!cookieHeader) {
                return await schema.safeParseAsync({}).then(result => result.success ? result.data : defaultValue);
            }

            return await schema.safeParseAsync(cookie.parse(cookieHeader)).then(result => result.success ? result.data : defaultValue);
        },
        async serialize(value: any) {
            return await cookie.serialize(await schema.parseAsync(value));
        },
        async serializeWithDefault(value: any, defaultValue: zod.infer<Schema>) {
            return await cookie.serialize(await schema.safeParseAsync(value).then(result => result.success ? result.data : defaultValue));
        }
    });
}
