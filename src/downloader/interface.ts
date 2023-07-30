export interface WriteAt {
    /**
     * Write a buffer at the given offset and return the number of bytes written.
     * @param p 
     * @param off 
     */
    writeAt(p: Uint8Array, off: number): Promise<number>;
}

/**
 * Determines the number of parts to split the file into.
 * 
 * @param size The size of the file.
 */
export type PartDeterminer = (size: number) => number;

/**
 * Determines the size of each chunk.
 * 
 * @param size The size of the file.
 */
export type ChunkSizeDeterminer = (size: number) => number;

export type DownloaderConfig = {
    /**
     * The maximum retry of the downloader.
     * 
     * When an error occurs, the downloader will retry the download until the maximum retry is reached.
     * 
     * Default value is 5.
     */
    maxRetries: number;

    /**
     * The maximum number of concurrent downloads.
     * 
     * If the value is -1, the downloader will download all chunks concurrently.
     * 
     * If the number of chunks is less than the value, the downloader will download all chunks concurrently.
     * 
     * If the number of chunks is greater than the value, the downloader will download the chunks in batches.
     * 
     * Default value is 5.
     */
    maxConcurrentDownloads: number;

    /**
     * Use to determine the number of chunks to split the file into.
     * 
     * You should use `partsDeterminer` either `chunkSizeDeterminer`, but not both.
     * 
     * You should prefer `partsDeterminer` over `chunkSizeDeterminer` because it will safer for connection errors.
     * 
     * Default we will use `partsDeterminer` to determine the number of chunks.
     */
    partDeterminer: PartDeterminer;

    /**
     * Use to determine the size of each chunk.
     * 
     * You should use `chunkSizeDeterminer` either `partsDeterminer`, but not both.
     */
    chunkSizeDeterminer: ChunkSizeDeterminer;

    /**
     * The size of each chunk.
     * 
     * If the value is -1, we will use `partDeterminer` to determine the number of chunks.
     * Then we will split the file into chunks with the same size.
     * 
     * If the value is greater than 0, we will split the file into chunks with the same as the value.
     * 
     * Unit: bytes
     */
    chunkSizeB: number;
}