const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');

async function initAndCommit() {
  const dir = path.resolve(__dirname, '..');
  console.log(`Working directory: ${dir}`);

  try {
    // 1. Initialize git repo if not already initialized
    await git.init({ fs, dir, defaultBranch: 'main' });
    console.log('✓ Git repository initialized.');

    // 2. Set remote origin
    const repoUrl = 'https://github.com/Ritesh2500/MINIPROJECT_BILL.git';
    try {
      await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl, force: true });
      console.log(`✓ Remote origin set to: ${repoUrl}`);
    } catch (err) {
      console.log(`Remote info: ${err.message}`);
    }

    // 3. Find all files to add (excluding .gitignore patterns)
    const ignoreList = ['node_modules', '.git', 'data', '.env', 'dist', 'coverage'];

    function getFiles(currentDir, relativePath = '') {
      let results = [];
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (ignoreList.includes(entry.name)) continue;
        const entryRel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(getFiles(fullPath, entryRel));
        } else {
          results.push(entryRel);
        }
      }
      return results;
    }

    const filesToAdd = getFiles(dir);
    console.log(`Adding ${filesToAdd.length} files to git index...`);

    for (const file of filesToAdd) {
      await git.add({ fs, dir, filepath: file });
    }
    console.log('✓ All files staged.');

    // 4. Commit
    const sha = await git.commit({
      fs,
      dir,
      message: 'feat: Initial release of BillMate Personal Bill & Payment Management System',
      author: {
        name: 'Ritesh',
        email: 'ritesh@users.noreply.github.com'
      }
    });

    console.log(`✓ Commit created successfully: ${sha}`);
    console.log('✓ Branch: main');
    return { success: true, sha };
  } catch (error) {
    console.error('Git operation error:', error);
    return { success: false, error: error.message };
  }
}

initAndCommit();
