# testcafe-reporter-xray-cloud-json

This is the **xray-cloud-json** reporter plugin for [TestCafé](http://devexpress.github.io/testcafe).

Using this reporter plugin, Test Execution reports can be generated in the [Xray Cloud JSON format](https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results#ImportExecutionResults-XrayJSONformat) which can then be uploaded automatically or manually using the [Xray Cloud REST API](https://docs.getxray.app/display/XRAYCLOUD/REST+API): [Import Execution Results v2](https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results+-+REST+v2#ImportExecutionResultsRESTv2-XrayJSONresults).

![preview image](https://raw.github.com/paulmedwards/testcafe-reporter-xray-cloud-json/master/media/preview.png)

## Install

```text
npm install testcafe-reporter-xray-cloud-json
```

## Usage

### Settings

This reporter requires some information to perform its functions. Some values are optional, some are required, and some are required depending on other parameter values. All of this is documented in the [`.env.example`](./.env.example) file.

### Command Line

When you run tests from the command line, specify the reporter name by using the `--reporter` option:

```text
testcafe chrome 'path/to/test/file.js' --reporter xray-cloud-json
```

You can also specify or override settings values by prefacing them on the command line as follows (example assumes use of `testcaferc.json` configuration file):

```text
JIRA_XRAY_CLOUD_UPLOAD=true JIRA_XRAY_CLOUD_TESTPLANKEY=XY-9999 testcafe chrome 'path/to/test/file.js'
```

### API

You can use the API in two ways:

1. As part of the `testCafe.reporter()` method
2. In the `testcaferc.json` configuration file.

#### `reporter()` method

```js
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('chrome')
    .reporter('xray-cloud-json') // <-
    .run();
```

#### `testcaferc.json` configuration file

Example showing `xray-cloud-json` reporter added at the bottom, in addition to the `junit` reporter:

```js
{
    "hostname": "localhost",
    "screenshots": {
        "path": "./artifacts/screenshots/",
        "takeOnFails": true,
        "pathPattern": "${DATE}/${TIME}/${USERAGENT}/${FIXTURE}/${TEST}/${RUN_ID}/${FILE_INDEX}.png",
        "fullPage": false
    },
    "selectorTimeout": 10000,
    "assertionTimeout": 15000,
    "pageLoadTimeout": 10000,
    "color": true,
    "skipJsErrors": true,
    "skipUncaughtErrors": true,
    "reporter": [{
            "name": "junit",
            "output": "artifacts/reports/result.junit.xml"
        },
        {
            "name": "xray-cloud-json",
            "output": "artifacts/reports/result.xraycloud.json"
        }
    ]
}
```

## Development

When updating the reporter, it's recommended to use the npm/yarn linking feature:

  1. `npm link` or `yarn link` (inside ./lib/ folder)
  2. `npm/yarn link testcafe-reporter-xray-cloud-json` (inside consumer root folder, i.e. your TestCafe project)

## Authors

- [Paul M Edwards](https://github.com/PaulMEdwards)
- [Mohammed Boukhenaif](https://github.com/s1mob)
- [Antonio Reyes](https://github.com/antreyes)
