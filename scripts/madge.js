const util = require('util');
const path = require('path');
const exec = util.promisify(require('child_process').exec);
const { createPrComment } = require('../lib/github-comment');
const querystring = require("querystring");

const madgeLib = require('../lib/madge');
const debug = require('debug')('madge-script')
const diff = require('diff-lines');

const ROOT = path.resolve(__dirname, '..');
const TEMP_DIR_NAME = '.temp';
const TEMP = path.resolve(ROOT, `./${TEMP_DIR_NAME}`);

const execWithDebug = async (...args) => {
  // debug(args[0]);
  const { stdout, stderr } = await exec(...args);

  // debug('stdout:', stdout);
  // debug('stderr:', stderr);

  return stdout;
}

async function createMadgeDot({ cloneUrl, branchName, sha }) {
  await execWithDebug(`rm -rf ${TEMP_DIR_NAME}`, { cwd: ROOT });
  await execWithDebug(`mkdir -p ${TEMP_DIR_NAME}`, { cwd: ROOT });
  await execWithDebug(`git clone -b ${branchName} --single-branch ${cloneUrl} .`, { cwd: TEMP });

  const dot = await madgeLib.createDot(require('../.temp/github-bot-madgerc'));

  await execWithDebug(`rm -rf ${TEMP_DIR_NAME}`, { cwd: ROOT });

  return dot;
}

const handlePullCreated = async (event, owner, repo) => {

  const { number, logger } = event;
  const options = { owner, repo, pull_number: number };
  
  debug(event.repository.clone_url);

  const oldDot = await createMadgeDot({
    cloneUrl: event.repository.clone_url,
    branchName: event.pull_request.base.ref,
    sha: event.pull_request.base.sha,
  });

  const newDot = await createMadgeDot({
    cloneUrl: event.repository.clone_url,
    branchName: event.pull_request.head.ref,
    sha: event.pull_request.head.sha,
  });

  const body = getBody(oldDot, newDot);

  createPrComment(options, body);
}

const getBody = (oldDot, newDot) => {
  if(oldDot === newDot) {
    return `no changes to file dependencies.

**File dependencies**
\`\`\`dot
${oldDot}
\`\`\`

[viewer](https://dreampuf.github.io/GraphvizOnline/#${querystring.escape(oldDot)})`
  }

  return`changes to file dependencies.

**File dependencies Diff**
\`\`\`dot
${diff(oldDot, newDot)}
\`\`\`

[viewer](https://dreampuf.github.io/GraphvizOnline/#${querystring.escape(oldDot)})
[viewer (changed)](https://dreampuf.github.io/GraphvizOnline/#${querystring.escape(newDot)})
`
}

const handlePullReopen = handlePullCreated;
const handleSynchronize = handlePullCreated;

module.exports = (app) => {
  app.on('pull_request.opened', handlePullCreated);
  app.on('pull_request.edited', handlePullReopen);
  app.on('pull_request.synchronize', handleSynchronize);
}