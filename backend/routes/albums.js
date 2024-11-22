import express from 'express';
import fs from 'node:fs';
import { IncomingForm, errors as formidableErrors } from 'formidable';
import {
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import s3Client from '../aws/s3.js';

let router = express.Router();

/**
 * Add photos and videos to given album
 */
router.post('/:name', async function (req, res, next) {
  const form = new IncomingForm({
    maxFileSize: 100 * 1024 * 1024, //100 MBs converted to bytes,
    allowEmptyFiles: false,
    filter: function ({ name, originalFilename, mimetype }) {
      // keep only images
      const valid = mimetype?.includes('image') || mimetype?.includes('video');
      if (!valid)
        form.emit(
          'error',
          new formidableErrors.default('Invalid file', 0, 400),
        );
      return valid;
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    const uploadedFiles = files.files;
    uploadedFiles.forEach((file) => {
      saveToS3(req.params.name, file);
    });

    return res.status(200).json({ files: uploadedFiles });
  });
});

async function saveToS3(albumName, file) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: `${albumName}/${file.originalFilename}`,
      Body: fs.createReadStream(file.filepath),
    }),
  );
}

async function listObjectsInBucket(albumName) {
  const response = await s3Client.send(
    new ListObjectsCommand({
      Bucket: process.env.AWS_BUCKET,
      Prefix: albumName,
    }),
  );

  if (response.Contents.length === 0) {
    return [];
  }

  const signedUrls = await Promise.all(
    response.Contents.map(async (object) => {
      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: object.Key,
      };

      const url = await getSignedUrl(s3Client, new GetObjectCommand(params), {
        expiresIn: 3600,
      });

      console.log(`Pre-signed URL for ${object.Key}: ${url}`);

      return { key: object.Key, signedUrl: url };
    }),
  );

  return signedUrls;
}

router.get('/:name', async function (req, res, next) {
  const response = await listObjectsInBucket(req.params.name);

  res.json({
    albumName: req.params.name,
    media: response,
  });
});

export default router;
