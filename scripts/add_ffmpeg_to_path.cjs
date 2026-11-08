const { execSync } = require('child_process');
const userPath = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"', { encoding: 'utf8' }).trim();
if (!userPath.includes('Nova Vid\\bin')) {
  const newPath = userPath + ';G:\\Nova Vid\\bin';
  execSync(`powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('Path', '${newPath.replace(/'/g, "''")}', 'User')"`);
  console.log('Successfully added G:\\Nova Vid\\bin to User PATH');
} else {
  console.log('G:\\Nova Vid\\bin is already in User PATH');
}
