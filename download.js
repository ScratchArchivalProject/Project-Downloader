const fs = require('fs');
const archiver = require("archiver");
const path = require("path");

// project id to download
const ID = 1147739568;

// always make sure to end this with sb3
// for archiving, we'd probably want the project name to be the id
const OUTPUT_FILE = "snake.sb3";

// safe for cross platform
const filePath = path.join(__dirname, OUTPUT_FILE);

// basic overwriting prevention
if (fs.existsSync(filePath)) {
    console.log(`File with same name already exists: ./${OUTPUT_FILE}`);
    process.exit(1);
}

(async () => {

    console.log(`[+] Starting download of project ${ID}`);

    let projectInfo = await fetch(`https://api.scratch.mit.edu/projects/${ID}`);
    let projectInfoJson = await projectInfo.json();

    if (!projectInfoJson) {
        console.log(`[!] Encountered critial error, project information JSON not present. Process exiting`);
        process.exit(1);
    } else if (projectInfoJson.code) {
        console.log(`[!] Encountered critial error, project has no viable information and returned code ${projectInfoJson.code}. Process exiting`);
        process.exit(1);
    }

    console.log(`[+] Downloading ${projectInfoJson.title} by ${projectInfoJson.author.username}`);

    const projectToken = projectInfoJson.project_token;

    const projectJsonResponse = await fetch(`https://projects.scratch.mit.edu/${ID}?token=${projectToken}`);

    let projectJson;

    // For some reason, old scratch projects don't use json and instead return a format I can't read
    // Should look into this but at least we need to handle it
    try {
        const text = await projectJsonResponse.text(); 
        projectJson = JSON.parse(text);
    } catch (error) {
        console.log(`[!] Encountered critial error, parsing JSON failed, might be a legacy version. Process exiting`);
        process.exit(1); 
    }

    if (!projectJson) {
        console.log(`[!] Encountered critial error, project JSON not present. Process exiting`);
        process.exit(1);
    }

    const targets = projectJson.targets;

    const output = fs.createWriteStream(OUTPUT_FILE);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    archive.append(JSON.stringify(projectJson), { name: "project.json" });

    console.log(`[+] project.json written`);

    let spriteNumber = 0;

    for (const target of targets) {

        spriteNumber++;
        console.log(`[+] Fetching costumes and sounds of costume ${spriteNumber}`);

        let assetNumber = 0;

        for (const costume of target.costumes) {

            assetNumber++;

            let response;
            let success = true;

            try {
                const url = `https://assets.scratch.mit.edu/internalapi/asset/${costume.md5ext}/get/`;
                response = await fetch(url);

            } catch (error) {
                success = false;
                console.log(`[!] Failed to fetch asset, this will result in question marked assets\n${error}`)
            }

            if (success) {

                // scratch assets can be either svg or png (bitmap)

                const isSvg = costume.md5ext.endsWith('.svg');

                let data;

                if (isSvg) {
                    data = await response.text();
                } else {
                    let arrayBuffer = await response.arrayBuffer();
                    data = Buffer.from(arrayBuffer);
                }

                archive.append(data, { name: `${costume.md5ext}` });

            }

        }

        for (const sound of target.sounds) {

            assetNumber++;

            let success = true;
            let buffer;

            try {
                const url = `https://assets.scratch.mit.edu/internalapi/asset/${sound.md5ext}/get/`;
                buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
            } catch (error) {
                success = false;
                console.log(`[!] Failed to fetch sound\n${error}`)
            }

            if (success) {
                archive.append(buffer, { name: `${sound.md5ext}` });
            }

        }

        console.log(`[+] Fetched ${assetNumber} costumes and sounds from costume ${spriteNumber}`);
    }

    await archive.finalize();
    console.log(`SB3 file written: ${OUTPUT_FILE}`);
})();

