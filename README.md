# Build

- se è il progetto è appena stato clonato, posizionarsi nella root del progetto e lanciare il comando `npm install` per installare nella cartella `node_modules` i tools per buildare e lanciare i tests

- la build richiede che sulla macchina locale sia installato un ambiente node.js la cui versione sia almeno pari a 14

- se non c'è già, copiare `lightstreamer-aws-ant-tasks-1.1.0.jar` in `<ant_home>/lib`. il jar si trova sul progetto (privato) https://github.com/Lightstreamer/lightstreamer-aws-ant-tasks nella sezione Releases. lightstreamer-aws-ant-tasks è un task custom di ant per fare l'upload su S3 della documentazione

- posizionarsi nella cartella `build` e lanciare gli script Ant `build_web.xml` e `build_node.xml`

- le librerie di produzione vengono salvate in `deploy_Web/npm/dist/mqtt.cool.js` e `deploy_Node.js/npm/dist/mqtt.cool.js`

- le librerie di test vengono salvate in `tests/web/lib/mqtt.cool-test.js` e `tests/nodejs/lib/mqtt.cool-test.js`

- vari parametri della build si possono impostare agendo su questi files:    
    * `deploy_*/version_res/*`
    * `deploy_*/release.properties`
    * `templates/*`

- altri links utili
    * https://rollupjs.org/guide/en/#big-list-of-options
    * https://jsdoc.app

- **NB1** perchè la minificazione generi codice corretto, è indispensabile attenersi alle regole dettate dal Google Closure Compiler (vedi https://developers.google.com/closure/compiler/docs/limitations, http://closuretools.blogspot.com/2010/10/this-this-is-your-this.html, https://github.com/google/closure-compiler/wiki)

- **NB2** ogni volta che cambia l'API del client lightstreamer, bisogna ricordarsi di aggiornare il file `build/externs.js`, che contiene i simboli che il Closure Compiler non deve rinominare


# Test

- per eseguire i test di integrazione bisogna prima lanciare l'immagine docker che si trova in https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/mqtt.cool-docker-compose

- se si vuole fare i test con i mock, omettere il parametro `int` dall'url e dalla riga di comando (vedi sotto)

- il file principale, che contiene un elenco dei test che vengono eseguiti, è `tests/test_case/allSuites.js`

## Web Browser

1. su Windows, lanciare Chrome come segue per disabilitare i CORS:
   ```sh
   "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" -disable-web-security --disable-gpu --user-data-dir=c:/chromeTemp
   ```

2. su Mac, lanciare Safari disabilitando i CORS tramite il menu `Develop>Disable Cross-Origin Restrictions`

3. aprire il browser e digitare l'url seguente:
   `file:///<client_js_project_dir>/tests/web/test.html?int&min#bottomlink`

## Node.js

1. dalla cartella `tests/nodejs`, lanciare il comando:
   `$ node test.js int`
