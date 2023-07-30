import { DownloadChunk } from "./download_chunk";
import { FileWriter } from "./file_writer";
import { DownloaderConfig, WriteAt } from "./interface";

/**
 * This class is responsible for downloading files from the internet.
 * 
 * Internally, it uses the `DownloadImplementation` class to download files.
 */
class DownloadImplementation {
    constructor(private config: DownloaderConfig, private url: string, private out: string) { }

    /**
     * Return the content length of the file.
     */
    async getContentLength(): Promise<string> {
        try {
            const response = await fetch(this.url, {
                method: 'HEAD'
            });
            return response.headers.get('content-length') || '0';
        }
        catch (e) {
            // Check status code
            if (e instanceof Response) {
                if (e.status === 404) {
                    throw new Error(`File not found at ${this.url}`);
                }

                if (e.status === 403) {
                    throw new Error(`Access denied to file at ${this.url}`);
                }

                if (e.status === 401) {
                    throw new Error(`Unauthorized to access file at ${this.url}`);
                }

                if (e.status === 416) {
                    throw new Error(`Requested range not satisfiable for file at ${this.url}`);
                }

                throw new Error(`Failed to get content length of file at ${this.url}; status code: ${e.status}`);
            }

            throw new Error(`Failed to get content length of file at ${this.url}; error: ${e}`);
        }
    }

    /**
     * Return the size of the file.
     * @returns 
     */
    async getFileSize(): Promise<number> {
        try {
            const contentLength = await this.getContentLength();
            return parseInt(contentLength);
        }
        catch (e) {
            throw new Error(`Failed to get file size of file at ${this.url}; error: ${e}`);
        }
    }

    /**
     * Determine the number of chunks to download based on the file size and `chunkSizeB`.
     * 
     * If `chunkSizeB` is less than or equal to 0, then `partDeterminer` is used to determine the number of chunks.
     * 
     * If `chunkSizeB` is greater than 0, then the number of chunks is determined by dividing the file size by `chunkSizeB`.
     * 
     * @param fileSize 
     * @returns 
     */
    determineNumberOfChunks(fileSize: number): number {
        if (this.config.chunkSizeB <= 0) {
            const numberOfChunks = this.config.partDeterminer(fileSize);
            this.config.chunkSizeB = Math.ceil(fileSize / numberOfChunks);
            return numberOfChunks;
        } else {
            const numberOfChunks = Math.ceil(fileSize / this.config.chunkSizeB);
            return numberOfChunks;
        }
    }

    createChunks(numberOfChunks: number, w: WriteAt): DownloadChunk[] {
        const chunks: DownloadChunk[] = [];
        for (let i = 0; i < numberOfChunks; i++) {
            const chunk = new DownloadChunk(w, i * this.config.chunkSizeB, this.config.chunkSizeB, 0);
            chunks.push(chunk);
        }
        return chunks;
    }

    /**
     * Batch the chunks based on maxConcurrentDownloads.
     * 
     * If maxConcurrentDownloads is less than or equal to 0, then each chunk is batched into its own array.
     * 
     * If maxConcurrentDownloads is greater than 0, then the chunks are batched into arrays of size maxConcurrentDownloads.
     * @param chunks 
     */
    batchChunks(chunks: DownloadChunk[]): DownloadChunk[][] {
        if (this.config.maxConcurrentDownloads <= 0) {
            return chunks.map((chunk) => [chunk]);
        } else {
            const batches: DownloadChunk[][] = [];
            if (chunks.length <= this.config.maxConcurrentDownloads) {
                return chunks.map((chunk) => [chunk]);
            }
            
            // Chunking to batches, the number of batches is equal to the number of chunks divided by maxConcurrentDownloads.
            // The last batch will be smaller than the rest if the number of chunks is not divisible by maxConcurrentDownloads.
            const numberChunksPerBatch = Math.ceil(chunks.length / this.config.maxConcurrentDownloads);
            for (let i = 0; i < chunks.length; i += numberChunksPerBatch) {
                const batch = chunks.slice(i, i + numberChunksPerBatch);
                batches.push(batch);
            }
            return batches;
        }
    }

    /**
     * Download a single chunk.
     * @param chunk 
     * @returns 
     */
    async downloadPart(chunk: DownloadChunk): Promise<number> {
        try {
            const range  = chunk.getRange();
            console.log(`Downloading part with range ${range}`);
            const response = await fetch(this.url, {
                headers: {
                    'Range': chunk.getRange(),
                }
            });

            if (response.status === 200) {
                throw new Error(`Server does not support range requests`);
            }

            if (response.status === 206) {
                const buffer = await response.arrayBuffer();
                const p = new Uint8Array(buffer);
                const bytesWritten = await chunk.write(p);
                return bytesWritten;
            }

            throw new Error(`Failed to download part; status code: ${response.status}`);
        }
        catch (e) {
            throw new Error(`Failed to download part; error: ${e}`);
        }
    }

    /**
     * Download a batch of chunks, sequentially.
     * @param batch 
     * @returns 
     */
    async downloadBatch(batch: DownloadChunk[]): Promise<number> {
        try {
            let writtenBytes = 0;
            for (let i = 0; i < batch.length; i++) {
                const chunk = batch[i];
                const bytesWritten = await this.downloadPart(chunk);
                writtenBytes += bytesWritten;
            }
            return writtenBytes;
        }
        catch (e) {
            throw new Error(`Failed to download batch; error: ${e}`);
        }
    }


    /**
     * Execute the download.
     * @returns 
     */
    async download(): Promise<number> {
        try {
            const fileSize = await this.getFileSize();
            const numberOfChunks = this.determineNumberOfChunks(fileSize);
            const fileWriter: WriteAt = new FileWriter(this.out);
            const chunks = this.createChunks(numberOfChunks, fileWriter);
            const batches = this.batchChunks(chunks);
            let writtenBytes = 0;
            let error: Error | null | unknown = null;

            console.log(`File size: ${fileSize}`);
            console.log(`Downloading ${numberOfChunks} chunks in ${batches.length} batches`);
            
            for (let i = 0; i < this.config.maxRetries; i++) {
                try {
                    const promises = batches.map((batch) => this.downloadBatch(batch));
                    const results = await Promise.all(promises);
                    writtenBytes = results.reduce((a, b) => a + b, 0);
                    error = null;
                    break;
                }
                catch (e) {
                    error = e;
                }
            }

            if (error) {
                throw error;
            }

            return writtenBytes;
        }
        catch (e) {
            throw new Error(`Failed to download file from ${this.url} to ${this.out}; error: ${e}`);
        }
    }
}

/**
 * Downloads files from the internet.
 */
export class Downloader {
    constructor(private config: DownloaderConfig) { }

    /**
     * Download file from `url` and save it to `filePath` then return the number of bytes written.
     * @param url 
     * @param filePath 
     */
    async download(url: string, filePath: string): Promise<number> {
        try {
            const implementation = new DownloadImplementation(this.config, url, filePath);
            return await implementation.download();
        }
        catch (e) {
            throw new Error(`Failed to download file from ${url} to ${filePath}; error: ${e}`)
        }
    }
}

enum SizeUnit {
    B = 1,
    KB = 1024,
    MB = 1024 * 1024,
    GB = 1024 * 1024 * 1024,
}

/**
 * Return the default configuration for the downloader.
 * @returns 
 */
export function defaultDownloaderConfig(): DownloaderConfig {
    return {
        chunkSizeB: -1,
        maxConcurrentDownloads: 32,
        partDeterminer: (fileSize: number) => {
            if (fileSize < 1 * SizeUnit.MB) return 1;
            if (fileSize < 10 * SizeUnit.MB) return 4;
            if (fileSize < 100 * SizeUnit.MB) return 16;
            return 32;
        },
        chunkSizeDeterminer: (fileSize: number) => {
            if(fileSize < 1 * SizeUnit.MB) return 1 * SizeUnit.MB;
            if(fileSize < 10 * SizeUnit.MB) return 2 * SizeUnit.MB;
            if(fileSize < 100 * SizeUnit.MB) return 10 * SizeUnit.MB;
            return 20 * SizeUnit.MB;
        },
        maxRetries: 3,
    }
}

export default Downloader;