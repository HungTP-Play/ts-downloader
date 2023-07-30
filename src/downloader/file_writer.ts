import fs from 'fs';
import { WriteAt } from "./interface";

export class FileWriter implements WriteAt {
    constructor(private filePath: string) {
    }
    /**
     * Write a buffer at the given offset and return the number of bytes written.
     * @param p 
     * @param off 
     */
    async writeAt(p: Uint8Array, off: number): Promise<number> {
        try {
            const fd = fs.openSync(this.filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT);
            const writtenBytes = fs.writeSync(fd, p, 0, p.length, off);
            fs.closeSync(fd);
            return writtenBytes;
        }
        catch (e) {
            throw new Error(`Failed to write to file at offset ${off}; size: ${p.length}; error: ${e}`);
        }
    }
}