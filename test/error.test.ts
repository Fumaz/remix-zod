import {zodAction} from "../src";

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
});

test('throws json response', async () => {
    const request = new Request('http://localhost:3000');
    const action = zodAction({}, async () => {
        throw new Error('test');
    });

    await expect(await action({
        request,
        params: {},
        context: {}
    })).rejects.toThrow(Response);
});
