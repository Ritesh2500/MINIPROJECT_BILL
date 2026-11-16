const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

async function pushRepo() {
  const dir = path.resolve(__dirname, '..');
  const token = process.argv[2] || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    console.log('------------------------------------------------------------');
    console.log('GitHub Push Requirement:');
    console.log('To push to https://github.com/Ritesh2500/MINIPROJECT_BILL.git,');
    console.log('GitHub requires a Personal Access Token (classic or fine-grained).');
    console.log('');
    console.log('Run the command with your token:');
    console.log('  node scripts/git-push.js <YOUR_GITHUB_TOKEN>');
    console.log('');
    console.log('Or using standard Git CLI if installed:');
    console.log('  git push -u origin main');
    console.log('------------------------------------------------------------');
    return;
  }

  console.log('Pushing to https://github.com/Ritesh2500/MINIPROJECT_BILL.git...');
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      onAuth: () => ({
        username: token,
        password: ''
      })
    });

    console.log('🎉 Successfully pushed to GitHub!');
    console.log(pushResult);
  } catch (err) {
    console.error('❌ Push failed:', err.message);
  }
}

pushRepo();
