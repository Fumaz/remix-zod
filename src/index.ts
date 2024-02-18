import {z as zod, ZodSchema} from "zod";
import {json, Params} from "@remix-run/react";
import {ActionFunction, ActionFunctionArgs, Cookie, LoaderFunction, LoaderFunctionArgs} from "@remix-run/node";

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
    }) => zod.custom<File>((val => {
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
                minimumFiles,
                maximumFiles,
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
    }) => zod.array(zx.file({
        minimumSize,
        maximumSize,
        mimetype
    })).min(minimumFiles ?? 0).max(maximumFiles ?? Infinity),
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
    throwBadRequest: throwBadRequest
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

async function parseOrThrow<Output>(schema: ZodSchema<Output>, value: any) {
    try {
        return await schema.parseAsync(value);
    } catch (error) {
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

export async function parseJson<Output>(request: Request, schema: ZodSchema<Output>) {
    const body = await request.json();

    return await parseOrThrow(schema, body);
}

export async function parseJsonSafe<Output>(request: Request, schema: ZodSchema<Output>) {
    const body = await request.json();

    return await schema.safeParseAsync(body);
}

export async function parseJsonWithDefault<Output>(request: Request, schema: ZodSchema<Output>, defaultValue: Output) {
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

export async function parseForm<Output>(request: Request, schema: ZodSchema<Output>) {
    const body = await request.formData();
    const data = formToObject(body);

    return await parseOrThrow(schema, data);
}

export async function parseFormSafe<Output>(request: Request, schema: ZodSchema<Output>) {
    const body = await request.formData();
    const data = formToObject(body);

    return await schema.safeParseAsync(data);
}

export async function parseFormWithDefault<Output>(request: Request, schema: ZodSchema<Output>, defaultValue: Output) {
    const body = await request.formData();
    const data = formToObject(body);

    return await schema.safeParseAsync(data).then(result => result.success ? result.data : defaultValue);
}

export async function parseBody<Output>(request: Request, schema: ZodSchema<Output>) {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJson(request, schema);
    }

    if (encoding === 'form') {
        return await parseForm(request, schema);
    }

    return throwBadRequest();
}

export async function parseBodySafe<Output>(request: Request, schema: ZodSchema<Output>) {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJsonSafe(request, schema);
    }

    if (encoding === 'form') {
        return await parseFormSafe(request, schema);
    }

    return throwBadRequest();
}

export async function parseBodyWithDefault<Output>(request: Request, schema: ZodSchema<Output>, defaultValue: Output) {
    const encoding = await getBodyEncoding(request);

    if (encoding === 'json') {
        return await parseJsonWithDefault(request, schema, defaultValue);
    }

    if (encoding === 'form') {
        return await parseFormWithDefault(request, schema, defaultValue);
    }

    return throwBadRequest();
}

export async function parseParams<Output>(params: Params<any>, schema: ZodSchema<Output>) {
    return await parseOrThrow(schema, params);
}

export async function parseParamsSafe<Output>(params: Params<any>, schema: ZodSchema<Output>) {
    return await schema.safeParseAsync(params);
}

export async function parseParamsWithDefault<Output>(params: Params<any>, schema: ZodSchema<Output>, defaultValue: Output) {
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

export async function parseQuery<Output>(request: Request | URLSearchParams, schema: ZodSchema<Output>) {
    if (request instanceof URLSearchParams) {
        return await parseOrThrow(schema, request);
    }

    const query = new URL(request.url).searchParams;
    const data = searchParamsToObject(query);

    return await parseOrThrow(schema, data);
}

export async function parseQuerySafe<Output>(request: Request | URLSearchParams, schema: ZodSchema<Output>) {
    if (request instanceof URLSearchParams) {
        return await schema.safeParseAsync(request);
    }

    const query = new URL(request.url).searchParams;
    const data = searchParamsToObject(query);

    return await schema.safeParseAsync(data);
}

export async function parseQueryWithDefault<Output>(request: Request | URLSearchParams, schema: ZodSchema<Output>, defaultValue: Output) {
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

export async function parseHeaders<Output>(headers: Headers, schema: ZodSchema<Output>) {
    return await parseOrThrow(schema, headersToObject(headers));
}

export async function parseHeadersSafe<Output>(headers: Headers, schema: ZodSchema<Output>) {
    return await schema.safeParseAsync(headersToObject(headers));
}

export async function parseHeadersWithDefault<Output>(headers: Headers, schema: ZodSchema<Output>, defaultValue: Output) {
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

export type ZodLoaderFunction<Params = unknown, Query = unknown> = (args: ZodLoaderFunctionArgs<Params, Query>) => ReturnType<LoaderFunction>;

export type ZodActionFunction<Params = unknown, Body = unknown> = (args: ZodActionFunctionArgs<Params, Body>) => ReturnType<ActionFunction>;

export function zodLoader<Params = unknown, Query = unknown>({
                                                                 params,
                                                                 query,
                                                             }: {
    params: ZodSchema<Params>;
    query: ZodSchema<Query>;
}, loader: ZodLoaderFunction<Params, Query>) {
    return async (args: LoaderFunctionArgs) => {
        return loader({
            ...args,
            parsedParams: await parseParams(args.params, params),
            parsedQuery: await parseQuery(args.request, query)
        });
    }
}

export function zodAction<Params = unknown, Body = unknown>({
                                                                params,
                                                                body
                                                            }: {
    params: ZodSchema<Params>;
    body: ZodSchema<Body>;
}, action: ZodActionFunction<Params, Body>) {
    return async (args: ActionFunctionArgs) => {
        return action({
            ...args,
            parsedParams: await parseParams(args.params, params),
            parsedBody: await parseBody(args.request, body)
        });
    }
}

export function createZodCookie<Output>(cookie: Cookie, schema: ZodSchema<Output>) {
    return Object.assign(cookie, {
        async parse(cookieHeader: string | null | Request | Headers) {
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
        async parseSafe(cookieHeader: string | null | Request | Headers) {
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
        async parseWithDefault(cookieHeader: string | null | Request | Headers, defaultValue: Output) {
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
        async serializeWithDefault(value: any, defaultValue: Output) {
            return await cookie.serialize(await schema.safeParseAsync(value).then(result => result.success ? result.data : defaultValue));
        }
    });
}
