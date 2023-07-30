# TS-Downloader

`TS-Downloader` is a simple tool to download files with multiple threads.

`TS-Downloader` is totally dependency-free, and it's written in pure TypeScript fs filesystem module and `fetch` API.

## How to use

```typescript
import Downloader, { defaultDownloaderConfig } from "./downloader/downloader";

function main() {
    const downloadUrl = "https://files.catbox.moe/em97nz.jpg"
    const output = "download.jpg"
    const downloader = new Downloader(defaultDownloaderConfig());
    downloader.download(downloadUrl, output).then((n)=>{
        console.log(`Downloaded ${n} bytes`)
        console.log(`Saved to ${output}`)
    }).catch((e)=>{
        console.log(`Error: ${e}`)
    })
}

main()
```

## Configuration

```typescript
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
     * You should prefer `partsDeterminer` over `chunkSizeDeterminer`.
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
```

### Default configuration

```typescript
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
```
