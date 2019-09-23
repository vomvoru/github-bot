const util = require('util');
const path = require('path');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);
const { createPrComment } = require('../lib/github-comment');

const debug = require('debug')('jscpd-script');
const { getStoreManager, JSCPD } = require('jscpd');

const ROOT = path.resolve(__dirname, '..');
const TEMP_DIR_NAME = '.temp';
const TEMP = path.resolve(ROOT, `./${TEMP_DIR_NAME}`);

const execWithDebug = async (...args) => {
  debug(args[0]);
  const { stdout, stderr } = await exec(...args);

  debug('stdout:', stdout);
  debug('stderr:', stderr);

  return stdout;
}

async function createJscpd({ cloneUrl, branchName, sha }) {
  // await execWithDebug(`rm -rf .jscpd`, { cwd: ROOT });
  await execWithDebug(`rm -rf ${TEMP_DIR_NAME}`, { cwd: ROOT });
  await execWithDebug(`mkdir -p ${TEMP_DIR_NAME}`, { cwd: ROOT });
  await execWithDebug(`git clone -b "${branchName}" --single-branch ${cloneUrl} .`, { cwd: TEMP });

  try {
    if (!fs.existsSync(path.resolve(TEMP, 'github-bot-jscpdrc.js'))) {
      return '';
    }
  } catch(err) {
    return '';
  }

  const config = require('../.temp/github-bot-jscpdrc');
  
  debug('github-bot-jscpdrc %o', config);

  // 아래 이슈로 강제 close 해야 하는 코드
  // https://github.com/kucherenko/jscpd/issues/207
  debug('close store');
  try{
    await getStoreManager().close();
  }catch(e){ }
  

  const options = {
    mode: 'strict',
    reporters: ['md'],
    output: path.resolve(TEMP, 'report'),
  };

  debug('new JSCPD');
  const cpd = new JSCPD(options);

  debug('detectInFiles %o', config.files);
  await cpd.detectInFiles(config.files);

  debug('get md file');
  const md = fs.readFileSync(path.resolve(TEMP, 'report', 'index.md'), 'utf8')

  await execWithDebug(`rm -rf ${TEMP_DIR_NAME}`, { cwd: ROOT });

  return md;
}

const handlePullCreated = async (event, owner, repo) => {
  const { number } = event;
  const options = { owner, repo, pull_number: number };

  debug('create oldJscpdMd');
  const oldJscpdMd = await createJscpd({
    cloneUrl: event.repository.clone_url,
    branchName: event.pull_request.base.ref,
    sha: event.pull_request.base.sha,
  });

  debug('create newscpdMd');
  const newscpdMd = await createJscpd({
    cloneUrl: event.repository.clone_url,
    branchName: event.pull_request.head.ref,
    sha: event.pull_request.head.sha,
  });

  debug('getBody');
  const body = getBody(oldJscpdMd, newscpdMd);

  debug('createPrComment');
  createPrComment(options, body);
}

const getBody = (oldJscpdMd, newscpdMd) => {
  if(oldJscpdMd === newscpdMd) {
    return `no changes to copy/paste analytic.
    
**copy/paste analytic**

${newscpdMd}`
  }

  return`changes to copy/paste analytic.

**Orgin copy/paste analytic**

${oldJscpdMd}

**New copy/paste analytic**

${newscpdMd}`
}

const handleSynchronize = handlePullCreated;

module.exports = (app) => {
  app.on('pull_request.opened', handlePullCreated);
  app.on('pull_request.synchronize', handleSynchronize);
}