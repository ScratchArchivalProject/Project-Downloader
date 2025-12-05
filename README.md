# Simple Project Downloader
Simple implementation of a script to download scratch projects programmatically

# Installation

At the very minimum you need Node.js v18+ and the files download.js and package.json to use it. 

Firstly run:
```bash
npm i
```
to install the dependencies for scget. There's only one, that being `archiver` to package the assets and json into a final zip file, because SB3 files are just renamed zip files.

# Usage
Arguments are in the code, specifically `ID` and `OUTPUT_FILE`.
```bash
node download.js
```

# How This Works

I thought it might be interesting to make a write up for this.

When you click on a scratch project, it fetches the project JSON from a url. 
```
https://projects.scratch.mit.edu/PROJECT_ID/?token=PROJECT_TOKEN/
```

Now we have the id which is easy enough to obtain. However, there is another value which is `PROJECT_TOKEN` and we need this to access the JSON for the project. 

As I've found, scratch actually provides an easy way to obtain this token, that being running an API fetch to the following url:
```
https://api.scratch.mit.edu/projects/PROJECT_ID/
```

This returns the information data for a project in JSON format, but it is not the project JSON that we need yet. In this informational data, the token is also contained.
```
{
  ...
  ...
  ...
  "project_token": ""
}
```
I haven't included the actual value, as it is a long string of numbers, letters, and other characters.

If we plug this into the url we referenced before as the `PROJECT_TOKEN` value, scratch will return the JSON file for the project. Now that we have this, we can just zip it and rename to .sb3 to run it, right? Not quite. Technically you *can* do that, but all the assets would be the infamous grey box with a question mark, signalling it could not find the asset. So then, how do we get these assets?

These are stored at a different url from that of the project JSON, that being:
```
https://assets.scratch.mit.edu/internalapi/asset/ASSET_ID/get/
```

But as you might see, there's a small issue! We don't know the `ASSET_ID`.

"Fortunately, this is easily solved. The project JSON  which we just got already contains the ID for every costume and sound required, and all assets are publicly available.

The project JSON structure is as follows:

```
JSON
|- targets
|- monitors
|- extensions
|- meta
```

Now we're interested in `targets`. This is an array of objects, each object being a sprite. Let's zoom in on... say index 1 of `targets`, or sprite 1.

```
{
  isStage: true,
  name: "Stage",
  variables: {},
  lists: {},
  broadcasts: {},
  blocks: {},
  comments: {},
  currentCostume: 0,
  costumes: [],
  sounds: [],
  volume: 100,
  layerOrder: 0,
  tempo: 60,
  videoTransparency: 50,
  videoState: "on",
  textToSpeechLanguage: null
}
```

As we can see, there's two arrays, `costumes`, and `sounds`. Those are the two we're interested in at the moment.

They are also both arrays of objects, each object storing the information for a sound or costume.

Let's zoom in on index 1 of the `costumes` array, shall we?
```
{
  name: "backdrop1",
  dataFormat: "svg",
  assetId: "cd512140d531fdbff22204e0ec5ed84a",
  md5ext: "cd512140d531fdbff22204e0ec5ed84a.svg",
  rotationCenterX: 240,
  rotationCenterY: 180
}
```
This looks promising! That right there is our assetId which we needed (this is just an example, that asset id doesn't lead to anything). So we need to grab the `md5ext` because it contains the file extension and put that into our url that we want to fetch from. It is important to note that it will not work if you don't use the `md5ext` field, because scratch requires the file extension in the field.
```
https://assets.scratch.mit.edu/internalapi/asset/md5ext/get/
```

And this will return the asset data, in this case an SVG file, though it could also be a PNG file for bitmap. This is the same for the sounds, though they will be in the WAV format.

The files can simply be saved with the exact same asset id in a zip folder, along with the project JSON. That zip folder can then be renamed to the .sb3 extension and you have a fully functional scratch project!
