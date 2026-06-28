const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://i.ytimg.com/vi/nywSCCS_BzE/hqdefault.jpg';
const dest = path.join(__dirname, '..', '..', 'blackred-wallet', 'public', 'youtube-thumbnail.jpg');

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Thumbnail downloaded successfully to: ' + dest);
  });
}).on('error', function(err) {
  fs.unlink(dest);
  console.error('Error downloading thumbnail: ' + err.message);
});
