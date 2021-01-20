import express from 'express';
import helmet from 'helmet';
import download from 'download';
import cors from 'cors';
import * as fs from 'fs-extra';
import * as path from 'path';
import { S3 } from 'aws-sdk';
import { DOWNLOAD_DIR, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY } from './env';
import promiseRouter from 'express-promise-router';
import * as yt from './yt';

let s3: S3;
if (S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY) {
  s3 = new S3({
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    region: 'us-east-1'
  });
}

export async function doesKeyExist(key: string) {
  try {
    await s3.headObject({
      Bucket: S3_BUCKET,
      Key: key
    }).promise();
    return true;
  } catch (err) {
    return false;
  }
}

export async function readJsonObject(key: string) {
  const object = await s3.getObject({
    Bucket: S3_BUCKET,
    Key: key
  }).promise();
  if (object.Body) {
    return JSON.parse(object.Body.toString());
  } else {
    throw new Error('No body.');
  }
}

export async function writeJsonObject(key: string, json: { [ key: string ]: any }) {
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: key,
    Body: JSON.stringify(json)
  }).promise();
}

export async function downloadMp3(id: string): Promise<{ status: 'complete' | 'error' }> {
  let key = `${id}.json`;
  if (await doesKeyExist(key)) {
    while (true) {
      const info = await readJsonObject(key);
      if (info.status == 'downloading' || info.status === 'converting') {
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (info.status === 'complete') {
        return info;
      }
    }
  } else {
    await writeJsonObject(key, {
      status: 'downloading',
      progress: 0
    });

    const out = path.resolve(DOWNLOAD_DIR, `${id}.mp3`);
    const dir = path.dirname(out);
    await fs.ensureDir(dir);
    const data = await yt.download(id, out, (status, percent) => {
      writeJsonObject(key, { status, progress: percent });
    });
    await s3.upload({
      Bucket: S3_BUCKET,
      Key: `${id}.mp3`,
      Body: fs.createReadStream(out),
      ACL: 'public-read',
      ContentType: 'application/octet-stream'
    }).promise();
    try {
      await download(data.thumbnail, dir, { filename: `${id}.jpg` });
      await s3.upload({
        Bucket: S3_BUCKET,
        Key: `${id}.jpg`,
        Body: fs.createReadStream(path.join(dir, `${id}.jpg`)),
        ACL: 'public-read'
      }).promise();
    } catch (err) {
    }
    const result = { ...data, status: 'complete' as 'complete' };
    writeJsonObject(key, result);
    return result;
  }
}

export const app = express();
const router = promiseRouter();
router.use(helmet());
router.use(cors());
router.get('/', async (_req, res) => {
  res.send('uwu');
});
router.get('/:id.mp3', async (req, res) => {
  let data = await downloadMp3(req.params.id);
  if (data.status === 'complete') {
    res.redirect(`https://s3.amazonaws.com/${S3_BUCKET}/${req.params.id}.mp3`);
  } else {
    res.status(500).send();
  }
});
router.get('/:id.jpg', async (req, res) => {
  if (await doesKeyExist(`${req.params.id}.jpg`)) {
    const out = path.resolve(DOWNLOAD_DIR, `${req.params.id}.jpg`);
    const dir = path.dirname(out);
    await download(`https://s3.amazonaws.com/${S3_BUCKET}/${req.params.id}.jpg`, dir, { filename: `${req.params.id}.jpg` });
    res.sendFile(out);
  } else {
    res.status(404).send();
  }
});
router.get('/:id.json', async (req, res) => {
  try {
    res.json(await readJsonObject(`${req.params.id}.json`));
  } catch (err) {
    res.status(404).send();
  }
});
router.use((_req, res, _next) => {
  res.redirect('/');
});
router.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).send();
});
app.use(router);