import { WriteAt } from "./interface";

export class DownloadChunk {
    constructor(
        private writer: WriteAt,
        private start: number,
        private size: number,
        private current: number
    ) { }

    getStartOffset(): number {
        return this.start;
    }

    /**
     * Write a buffer at the given offset and return the number of bytes written.
     * @param p 
     * @param off 
     * @returns 
     */
    async write(p: Uint8Array): Promise<number> {
        if (this.current >= this.size) {
            return 0;
        }

        const n = await this.writer.writeAt(p, this.start + this.current);
        this.current += n;
        return n;
    }

    /**
     * Return the range of the chunk.
     * @returns 
     */
    getRange(): string {
        return `bytes=${this.start}-${this.start + this.size - 1}`
    }
}