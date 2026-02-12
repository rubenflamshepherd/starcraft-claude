import app from './app.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Make sure ffmpeg is installed:');
  console.log('  macOS: brew install ffmpeg');
  console.log('  Ubuntu: sudo apt install ffmpeg');
  console.log('');
});
