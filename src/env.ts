require('dotenv').config();
import * as env from 'env-var';

export const PORT = env.get('PORT').default('8080').asPortNumber();
export const DOWNLOAD_DIR = env.get('DOWNLOAD_DIR').default('downloads').asString();
export const S3_BUCKET = env.get('S3_BUCKET').default('').asString();
export const S3_ACCESS_KEY = env.get('S3_ACCESS_KEY').default('').asString();
export const S3_SECRET_KEY = env.get('S3_SECRET_KEY').default('').asString();