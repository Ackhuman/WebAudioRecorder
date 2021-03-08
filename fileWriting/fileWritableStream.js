var bytesWritten = 0;
export class FileWritableStream extends WritableStream {
    constructor(fileStream, headerWriteMethod, headerLengthBytes, onError) {
        super({
            // Implement the sink
            async start(controller) {
                // We should resize the file to 0 to overwrite it.
                await fileStream.truncate(0);
                if(headerLengthBytes) {
                    //Currently it's not possible to seek past the end of a file.
                    //So first, we need to "truncate" which really just means to resize it.
                    //May as well add some extra room since we're going to be filling it anyway.
                    await fileStream.truncate(headerLengthBytes);
                    return fileStream.seek(headerLengthBytes);
                }
            },
            async write(chunk) {
                bytesWritten += chunk.byteLength;
                return fileStream.write({ type: 'write', data: chunk });
            },
            async close() {
                let promise = Promise.resolve();
                if (headerWriteMethod) {
                    let headerBuffer = new ArrayBuffer(headerLengthBytes);
                    let view = new DataView(headerBuffer);
                    let headerBytes = headerWriteMethod(view, bytesWritten);
                    //Seek back to the beginning of the file and write the header using the size counted.
                    promise = fileStream.seek(0)
                        .then(() => fileStream.write({ type: 'write', data: headerBytes.buffer }));
                }
                return promise.then(() => fileStream.close());
            },
            abort(err) {
                onError(err);
            }
        });
    }
}