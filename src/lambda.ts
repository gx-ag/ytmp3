import { app } from './app';
import serverless from 'serverless-http';
const binary = [
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/xml',
  'application/x-font-woff',
  'application/font-woff',
  'application/x-font-ttf',
  'application/font-ttf',
  'font/eot',
  'font/woff',
  'font/ttf',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'text/comma-separated-values',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/text',
  'text/xml'
];
module.exports.handler = serverless(app, { binary });