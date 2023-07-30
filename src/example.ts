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