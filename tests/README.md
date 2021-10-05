# Integrations Test

## From Web Browser

1. On Windows, launch chrome as follow to disable CORS:
   ```sh
   "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" -disable-web-security --disable-gpu --user-data-dir=c:/chromeTemp
   ```

2. Point the browser to the following url:
   `file:///<client_js_project_dir>/tests/web/test.html?int&min#bottomlink`

## From Node.js

1. From `tests/nodejs/lib`, run the following command to install the required dependencies:
   `$ npm install faye-websocket xmlhttprequest-cookie`

2. From `tests/nodejs', launch the tests:
   `$ node test.js int`

