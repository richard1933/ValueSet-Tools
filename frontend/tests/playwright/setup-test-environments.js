/* eslint-disable */
/* # TermHub frontend tests

## Environments
Environments are specific setups / deployments where we want to run our tests, e.g. local / dev / prod. This information
is passed to the test script via a hyphen-delimited environmental variable, e.g. `ENVIRONMENTS=local-dev-prod npx
playwright test`, where  dev is short for 'development' and prod is short for 'production'.

## todo's: optimizations
    - Running on different deployments
    (a) diff file for each. maybe a commmon test file which is a function that takes appUrl, and all that local.test.js would do was set appUrl and then pass it to that func. Then could run via `npx playwright test FILENAME` and make a `make` command as shorthand
    (b) Loop: 1 file and loop over each deployment or pass a flag to select which one - (what's implemented here)
    (c) Command?: make a command that sets the URL in a file and then import that into the playwright test
    (d) playwright.config.js? - (didn't work; kinda makes sense since that url doesn't get passed)
*/
import {DEPLOYMENT} from "../../src/env";


// Config --------------------------------------------------------------------------------------------------------------
export const deploymentConfigs = {
  local: 'http://127.0.0.1:3000',
  dev: 'https://icy-ground-0416a040f.2.azurestaticapps.net',
  prod: 'https://purple-plant-0f4023d0f.2.azurestaticapps.net',
};

// CLI --------------------------------------------------------------------------------------------------------------
// https://playwright.dev/docs/test-parameterize
// Usable like: ENVIRONMENTS=dev-prod yarn test:e2e

// - Determine which environments to run tests on
let envsString = DEPLOYMENT;
if (process.env.ENVIRONMENTS) {
  envsString = process.env.ENVIRONMENTS;
}
const envs = envsString.split("-");
export let selectedConfigs = {};
for (let key in deploymentConfigs) {
  if (envs.includes(key)) {
    selectedConfigs[key] = deploymentConfigs[key];
  }
}
