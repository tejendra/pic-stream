import fs from 'node:fs';
import { S3Client } from '@aws-sdk/client-s3';

const AWS_ACCESS_KEY = fs.readFileSync('/run/secrets/aws_access_key', 'utf8');

const AWS_SECRET_ACCESS_KEY = fs.readFileSync(
  '/run/secrets/aws_secret_access_key',
  'utf8',
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export default s3Client;
