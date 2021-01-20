rm -rf build
rm -rf dist
rm -rf ytmp3.zip
mkdir build
npx -p typescript tsc
cp -r dist build/src
cp package*.json build/
(cd build && npm install --only=prod)
(cd build && zip -r ../ytmp3.zip src node_modules ffmpeg)