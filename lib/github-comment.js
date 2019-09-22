'use strict'

const { App } = require("@octokit/app");
const { request } = require("@octokit/request");

const app = new App({ id: process.env.GITHUB_APP_IDENTIFIER, privateKey: JSON.parse(`"${process.env.PRIVATE_KEY}"`)});
const jwt = app.getSignedJsonWebToken();

exports.createPrComment = async ({ owner, repo, pull_number }, body) => {
  const { data } = await request("GET /repos/:owner/:repo/installation", {
    owner,
    repo,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: "application/vnd.github.machine-man-preview+json"
    }
  });

  const installationAccessToken = await app.getInstallationAccessToken({
    installationId: data.id
  });

  const res = await request("POST /repos/:owner/:repo/issues/:issue_number/comments", {
    owner,
    repo,
    issue_number: pull_number,
    headers: {
      authorization: `token ${installationAccessToken}`,
      accept: "application/vnd.github.machine-man-preview+json"
    },
    body,
  });
}