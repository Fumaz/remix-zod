# remix-zod

`remix-zod` is an integration library for [Remix](https://remix.run) applications that leverages the power
of [Zod](https://github.com/colinhacks/zod) for robust and elegant data validation. This library simplifies the process
of validating and parsing data from requests in Remix actions and loaders, offering a declarative and type-safe way to
ensure your application data integrity.

## Features

- **Type Safety**: Leverage TypeScript to ensure the data structure of your requests at compile time.
- **Declarative Validation**: Use Zod schemas to declaratively validate request bodies, query parameters, headers, and
  more.
- **Custom Error Handling**: Easily customize error responses for failed validations to maintain consistency across your
  API.
- **Flexible Parsing**: Supports parsing and validation of JSON, form data, and multipart form data, including file
  uploads.
- **Extended Zod Functionality**: Additional utility functions and schema types specifically designed for common web
  patterns and Remix requirements.

## Installation

```sh
npm install remix-zod zod
```

or

```sh
bun add remix-zod zod
```

Make sure you have `remix` and `zod` installed in your project as `remix-zod` is designed to work with them.

## Usage

### Basic Example

Below is a simple example of how to use `remix-zod` in a Remix action function with a Zod schema for validation:

```typescript
import {z as zod} from "zod";
import {action} from "remix";
import {zodAction} from "remix-zod";

const MySchema = zod.object({
    name: zod.string().min(1, "Name is required"),
    age: zod.number().min(18, "Must be at least 18"),
});

export const myAction = zodAction({
    body: MySchema,
}, async ({parsedBody}) => {
    // parsedBody is already validated against MySchema
    console.log(parsedBody.name, parsedBody.age);
    // Perform your logic here
});
```

### Advanced Usage

For more complex scenarios, including file uploads, custom error handling, and parsing cookies or headers, `remix-zod`
provides a comprehensive set of utilities.

#### File Upload Validation

```typescript
import {z as zod} from "zod";
import {zodAction, zx} from "remix-zod";

const FileSchema = zx.file({
    mimetype: "image/jpeg",
    maximumSize: {
        value: 5,
        unit: 'MB'
    }
});

export const uploadAction = zodAction({
    body: zod.object({
        avatar: FileSchema,
    }),
}, async ({parsedBody}) => {
    // Handle the validated file upload
});
```

### Customizing Error Responses

`remix-zod` allows for customization of the error responses, enabling you to maintain a consistent API structure even in
the face of validation errors.

```typescript
import {customBadRequestJson} from "remix-zod";

// Customize the JSON response for bad requests
customBadRequestJson = (message) => ({
    error: true,
    message
});
```

## Using `remix-zod` with Loaders

`remix-zod` seamlessly integrates with Remix loaders, enabling you to validate query parameters and URL parameters using
Zod schemas. This ensures that your loader functions receive only valid data, simplifying logic and improving data
integrity.

### Loader Example

Here's how you can use `remix-zod` in a Remix loader function:

```typescript
import {z as zod} from "zod";
import {loader} from "remix";
import {zodLoader} from "remix-zod";

const ParamsSchema = zod.object({
    userId: zod.string().uuid(),
});

const QuerySchema = zod.object({
    search: zod.string().optional(),
});

export const myLoader = zodLoader({
    params: ParamsSchema,
    query: QuerySchema,
}, async ({
              parsedParams,
              parsedQuery
          }) => {
    // Both parsedParams and parsedQuery are validated against their respective schemas
    console.log(parsedParams.userId, parsedQuery.search);
    // Perform your loader logic here
});
```

This example demonstrates how to validate both URL parameters and query parameters in a loader function, ensuring that
the data you work with is exactly as expected.

## Individual Parse Methods

`remix-zod` provides a variety of parsing methods to handle different parts of the HTTP request, including:

- **JSON Body**: `parseJson`, `parseJsonSafe`, `parseJsonWithDefault`
- **Form Data**: `parseForm`, `parseFormSafe`, `parseFormWithDefault`
- **URL Parameters**: `parseParams`, `parseParamsSafe`, `parseParamsWithDefault`
- **Query Parameters**: `parseQuery`, `parseQuerySafe`, `parseQueryWithDefault`
- **Headers**: `parseHeaders`, `parseHeadersSafe`, `parseHeadersWithDefault`

### Using Parse Methods

Here's how to use these parse methods in your actions or loaders:

#### Parsing JSON Body

```typescript
export const myAction = async ({request}) => {
    const parsedBody = await parseJson(request, MySchema);
    // Use parsedBody here
};
```

#### Parsing Form Data

```typescript
export const myAction = async ({request}) => {
    const parsedBody = await parseForm(request, MySchema);
    // Use parsedBody here
};
```

#### Parsing URL and Query Parameters

In loaders, you might want to validate URL and query parameters:

```typescript
export const myLoader = async ({
                                   request,
                                   params
                               }) => {
    const parsedParams = await parseParams(params, ParamsSchema);
    const parsedQuery = await parseQuery(request, QuerySchema);
    // Use parsedParams and parsedQuery here
};
```

#### Parsing Headers

```typescript
export const myLoader = async ({request}) => {
    const parsedHeaders = await parseHeaders(request.headers, HeadersSchema);
    // Use parsedHeaders here
};
```

Each of these methods ensures that the data you work with matches the schema you define, providing a robust layer of
validation for your Remix applications. This approach minimizes runtime errors and enhances the overall security of your
application by preventing invalid data from being processed.

## Documentation

For detailed documentation on all the features and utilities provided by `remix-zod`, please refer to the
official [Zod documentation](https://github.com/colinhacks/zod) and the Remix documentation for
handling [actions and loaders](https://remix.run/docs).

## Contributing

We welcome contributions to `remix-zod`! Whether it's bug reports, feature requests, or pull requests, your input is
valuable and appreciated. Please refer to the project's [GitHub repository](https://github.com/Fumaz/remix-zod) for contribution guidelines.

## License

`remix-zod` is MIT licensed.
