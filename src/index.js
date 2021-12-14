const envExamplePath = require('path').resolve(__dirname, '..', '.env.example');
require('dotenv-safe').config({
    allowEmptyValues: true,
    example:          envExamplePath
});
const fs = require('fs');
const axios = require('axios');
require('util').inspect.defaultOptions.depth = null; // enable console.log full object output

let currentTest = {};

let DEBUG = false;

function getEnv (key, _default) {
    const v = process.env[key];
    if (DEBUG === true) console.log(`Getting env var '${key}'='${v}'`);

    if (v !== '' && typeof v !== 'undefined') {
        if (DEBUG === true) console.log(`Found env var '${key}'='${v}'`);

        if (v === 'true' || v === 'false') {
            if (DEBUG === true) console.log(`Detected Boolean value '${v}'`);
            if (v === 'true')
                return true;
            return false;
        }

        return v;
    }
    if (DEBUG === true) console.log(`Env var '${key}'='', using default: '${_default}'`);
    return _default;
}

DEBUG = getEnv('JIRA_XRAY_CLOUD_DEBUG', false);

module.exports = function () {
    return {
        xrayReport: {
            info:  {},
            tests: []
        },

        noColors: true,

        settings: {
            writeFile:    getEnv('JIRA_XRAY_CLOUD_WRITE_FILE', true),
            upload:       getEnv('JIRA_XRAY_CLOUD_UPLOAD', false),
            hostname:     getEnv('JIRA_XRAY_CLOUD_HOSTNAME', 'https://xray.cloud.xpand-it.com'),
            clientId:     getEnv('JIRA_XRAY_CLOUD_CLIENT_ID', 'client_id'),
            clientSecret: getEnv('JIRA_XRAY_CLOUD_CLIENT_SECRET', 'client_secret'),
            project:      getEnv('JIRA_XRAY_CLOUD_PROJECT', ''),
            testPlanKey:  getEnv('JIRA_XRAY_CLOUD_TESTPLANKEY', ''),
        },

        async writeFile (reportJsonData) {
            console.log('\nWriting JSON file...');

            await this.write(JSON.stringify(reportJsonData, null, 1));

            console.log('JSON file written\n');
        },

        async uploadToXray (reportJsonData) {
            console.log('\nUploading JSON Test Execution Report to Jira Xray Cloud...');

            // Authenticate with Xray Cloud for Jira Cloud
            const optionsAuth = {
                url:     `${this.settings.hostname}/api/v2/authenticate`,
                method:  'POST',
                json:    true,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    'client_id':     this.settings.clientId,
                    'client_secret': this.settings.clientSecret,
                },
            };
            if (DEBUG === true) console.log('🚀 uploadToXray: optionsAuth:', optionsAuth);

            const responseAuth = await axios(optionsAuth);
            const authToken = `Bearer ${responseAuth.data}`;
            if (DEBUG === true) console.log('🚀 uploadToXray: authToken:', authToken);

            // Import Xray Cloud JSON formatted Test Execution Report to Xray Cloud
            const optionsImportExecutionJSON = {
                url:     `${this.settings.hostname}/api/v2/import/execution`,
                method:  'POST',
                json:    true,
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': authToken,
                },
                data: reportJsonData,
            };
            if (DEBUG === true) console.log('🚀 uploadToXray: optionsImportExecutionJSON:', optionsImportExecutionJSON);

            const responseImportExecutionJSON = await axios(optionsImportExecutionJSON);
            if (DEBUG === true) console.log('🚀 uploadToXray: responseImportExecutionJSON:', responseImportExecutionJSON.data);

            const baseUrl = String(responseImportExecutionJSON.data.self).split('/rest')[0];
            const issueUrl = `${baseUrl}/browse/${responseImportExecutionJSON.data.key}`;
            console.log(issueUrl);

            console.log('Finished uploading\n');
        },

        async reportTaskStart (startTime, userAgents, testCount) {
            if (DEBUG === true) console.log('🚀 settings:', this.settings);

            this.startTime = startTime;
            this.testCount = testCount;

            if (DEBUG === true) console.log('Running tests in:', userAgents, '\n');

            this.settings.instance = getEnv('JIRA_XRAY_CLOUD_INSTANCE', '');

            const environments = [];
            // Add instance as first Environment if set
            if (this.settings.instance !== '') environments.push(this.settings.instance);
            // Strip version numbers and spaces from userAgents and split by comma into array
            const envs = String(userAgents).replace(/\d|\.| |[Hh]eadless|Microsoft/g, '').split(',');
            envs.forEach((e) => environments.push(e));
            if (DEBUG === true) console.log('🚀 reportTaskStart: environments:', environments);

            if (this.settings.project !== '')
                this.xrayReport.info.project = this.settings.project;
            if (this.settings.testPlanKey !== '')
                this.xrayReport.info.testPlanKey = this.settings.testPlanKey;
            this.xrayReport.info.summary = 'TestCafe Automated Test Execution';
            if (this.settings.instance !== '')
                this.xrayReport.info.summary += ` on ${this.settings.instance}`;
            if (DEBUG === true) console.log('🚀 reportTaskStart: this.xrayReport.info.summary', this.xrayReport.info.summary);
            this.xrayReport.info.description = 'Test Execution Report automatically generated by TestCafe Framework';
            this.xrayReport.info.testEnvironments = environments;
            this.xrayReport.info.startDate = this.moment(startTime).format('YYYY-MM-DDThh:mm:ssZ');
        },

        async reportFixtureStart (name, path, meta) {
            this.currentFixtureName = name;

            if (DEBUG === true) console.log(`Fixture: ${name}\nPath: ${path}\nFixture Meta:`, meta, '\n');

            // throw new Error('Not implemented');
        },

        async reportTestStart (name, meta) {
            // NOTE: This method is optional.

            this.currentTestName = name;

            if (DEBUG === true) console.log(`Starting Test: ${name}\nTest Meta:`, meta, '\n');
        },

        async reportTestDone (name, testRunInfo, meta) {
            const errors      = testRunInfo.errs;
            const warnings    = testRunInfo.warnings;
            const hasErrors   = !!errors.length;
            const hasWarnings = !!warnings.length;
            const result      = hasErrors ? this.chalk.red('FAILED') : this.chalk.green('PASSED');

            if (hasErrors) {
                if (DEBUG === true) console.log('\nErrors:');

                errors.forEach(error => {
                    if (DEBUG === true) console.log(this.formatError(error));
                });
            }

            if (hasWarnings) {
                if (DEBUG === true) console.log('\nWarnings:');

                warnings.forEach(warning => {
                    if (DEBUG === true) console.log(warning);
                });
            }

            let testStatus = 'TODO';
            const currentEvidences = {};

            const testStartDate = new Date();

            if (meta.testId)
                currentTest.testKey = meta.testId;
            else
                currentTest.testKey = '';

            if (!testRunInfo.skipped) {
                if (testRunInfo.errs.length > 0) {
                    testStatus = 'FAILED';

                    if (testRunInfo.screenshots?.length > 0) {
                        currentTest.evidences = [];

                        for (var i in testRunInfo.screenshots) {
                            currentEvidences.data = fs.readFileSync(testRunInfo.screenshots[i].screenshotPath, 'base64');
                            currentEvidences.filename = testRunInfo.screenshots[i].screenshotPath;
                            currentEvidences.contentType = 'image/png';
                            currentTest.evidences.push(JSON.parse(JSON.stringify(currentEvidences)));
                        }
                    }
                }
                else if (testRunInfo.errs.length === 0)
                    testStatus = 'PASSED';
            }

            currentTest.comment = name;
            currentTest.status = testStatus;
            currentTest.start = this.moment(testStartDate).format('YYYY-MM-DDThh:mm:ssZ');
            currentTest.finish = this.moment(testStartDate).add(testRunInfo.durationMs, 'ms').format('YYYY-MM-DDThh:mm:ssZ');
            delete currentTest.comment.errs;

            if (DEBUG === true) console.log(`${result}: ${name}\nTest Meta:`, meta, '\ncurrentTest:', currentTest, '\n');
            this.xrayReport.tests.push(JSON.parse(JSON.stringify(currentTest)));
            currentTest = {};
        },

        async reportTaskDone (endTime, passed, warnings, result) {
            const durationMs  = endTime - this.startTime;

            if (DEBUG === true) {
                const durationStr = this.moment
                    .duration(durationMs)
                    .format('h[h] mm[m] ss[s]');

                let footer = result?.failedCount ?
                    `${result?.failedCount}/${this.testCount} failed` :
                    `${result?.passedCount} passed`;

                footer += ` (Duration: ${durationStr})`;
                footer += ` (Passed: ${passed})`;
                footer += ` (Skipped: ${result?.skippedCount})`;
                footer += ` (Warnings: ${warnings.length})`;

                console.log(footer);
            }

            this.xrayReport.info.finishDate = this.moment(endTime).format('YYYY-MM-DDThh:mm:ssZ');

            if (this.settings.writeFile === true) await this.writeFile(this.xrayReport);

            if (this.settings.upload === true) await this.uploadToXray(this.xrayReport);
        }
    };
};
