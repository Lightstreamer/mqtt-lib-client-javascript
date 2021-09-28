/**
 *  In Node.js, docker.js's dependencies will be got from mqtt.cool-test.js
 */
define('Docker', ['LoggerManager', 'XMLHttpRequest'],
  function(LoggerManager, XMLHttpRequest) {

    var log = LoggerManager.getLoggerProxy('docker');

    function Docker(address, keepAliveMap) {
      this.address = address;
      this._keepAliveMap = keepAliveMap;
      this.connectionTimeout = 50000;
    }

    Docker.prototype = {

      _keepAlive: function(name, timeout, callBack, pause) {
        var check = setInterval(function(url) {
          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
              switch (xhr.status) {
                case 200:
                  clearInterval(check);
                  invoke();
                  break;

                default:
                  break;
              }
            }
          };
          xhr.open('GET', url, true);
          xhr.send(null);
        }, 1000, this._keepAliveMap[name]);

        var timeOut = setTimeout(function() {
          clearInterval(check);
        }, timeout);

        function invoke() {
          log.info('Container <' + name + '> started');
          clearTimeout(timeOut);
          if (callBack) {
            if (pause) {
              setTimeout(callback, pause);
            } else {
              callBack();
            }
          }
        }
      },

      inspect: function(container, onContainer, onNotFound) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 200:
                if (onContainer) {
                  onContainer(xhr.responseText);
                }
                break;

              case 404:
                if (onNotFound) {
                  onNotFound();
                }
                break;

              default:
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.logError(xhr.responseText);
        };
        xhr.onabort = function() {
          log.debug('Aborted:', xhr.responseText);
        };
        xhr.open('GET', this.getUrl('/containers/' + container + '/json'), true);
        xhr.send(null);
      },

      listImages: function(onImages) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 200:
                if (onImages) {
                  onImages(xhr.responseText);
                }
                break;

              case 404:
                throw new Error(xhr.responseText);

              default:
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.logError(xhr.responseText);
        };
        xhr.onabort = function() {
          log.debug('Aborted:', xhr.responseText);
        };
        xhr.open('GET', this.getUrl('/images/json'), true);
        xhr.send(null);
      },

      getUrl: function(path) {
        return 'http://' + this.address + path;
      },

      _onContainerStarted: function(name, callback, pause) {
        if (!callback) {
          return;
        }
        if (this._keepAliveMap[name]) {
          this._keepAlive(name, this.connectionTimeout, callback, pause);
          return;
        }
        if (pause) {
          setTimeout(function() {
            log.info('Container <' + name + '> started');
            callback();
          }, pause);
        } else {
          log.info('Container <' + name + '> started');
          callback();
        }
      },

      /**
       * @param {string} name - The container name
       * @param {function} onStarted - The callback to be triggered once the
       *   container is started
       * @param {?pause} pause - The pause time
       */
      startContainer: function(name, onStarted, pause) {
        log.logDebug('Request to start container', name);
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            log.debug('Request to start container <' + name + '> DONE');
            switch (xhr.status) {
              case 204:
                self._onContainerStarted(name, onStarted, pause);
                break;
              case 304:
                throw new Error('container <' + name + '> already started');

              case 404:
                throw new Error(xhr.responseText);

              default:
                log.warn('Unhandled status: ' + xhr.status);
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.error(xhr.responseText);
        };
        xhr.onabort = function() {
          log.debug(xhr.responseText);
        };
        xhr.open('POST', this.getUrl('/containers/' + name + '/start'), true);
        xhr.send(null);
      },

      stopContainer: function(name, onStopped) {
        log.logDebug('Request to stop container', name);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            var invoke = false;
            log.debug('Request to stop container <' + name + '> DONE');
            switch (xhr.status) {
              case 204:
                log.info('Container <' + name + '> stopped');
                invoke = true;
                break;
              case 304:
                // Already stopped
                log.warn('Container <' + name + '> already stopped');
                invoke = true;
                break;

              case 404:
                throw new Error(xhr.responseText);

              default:
                break;
            }

            if (invoke && onStopped) {
              onStopped();
            }
          }
        };

        xhr.onerror = function() {
          log.error(xhr.responseText);
        };

        xhr.onabort = function() {
          log.debug(xhr.responseText);
        };

        xhr.open('POST', this.getUrl('/containers/' + name + '/stop'), true);
        xhr.send(null);
      },

      pauseContainer: function(name, onPaused) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 204:
                log.info('Container <' + name + '> paused');
                if (onPaused) {
                  onPaused();
                }
                break;

              case 404:
                throw new Error(xhr.responseText);

              default:
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.error(xhr.responseText);
        };
        xhr.onabort = function() {
          log.debug(xhr.responseText);
        };
        xhr.open('POST', this.getUrl('/containers/' + name + '/pause'), true);
        xhr.send(null);
      },

      unpauseContainer: function(name, onUnpaused) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 204:
                log.info('Container <' + name + '> paused');
                if (onUnpaused) {
                  onUnpaused();
                }
                break;

              case 404:
                throw new Error(xhr.responseText);

              default:
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.error(xhr.responseText);
        };
        xhr.onabort = function() {
          log.debug(xhr.responseText);
        };
        xhr.open('POST', this.getUrl('/containers/' + name + '/unpause'), true);
        xhr.send(null);
      },

      restartContainer: function(name, onRestarted, onFailure) {
        log.logDebug('Request to restart container', name);
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 204:
                log.debug('Request to restart container <' + name + '> DONE');
                self._onContainerStarted(name, onRestarted);
                break;
              case 404:
                if (onFailure) {
                  onFailure(xhr.responseText);
                  break;
                } else {
                  throw new Error(xhr.responseText);
                }

              default:
                log.warn('Unhandled status: ' + xhr.status);
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.logError('Error: ', xhr.responseText);
          if (onFailure) {
            onFailure(xhr.responseText);
          }
        };
        xhr.onabort = function() {
          log.debug('Abort: ', xhr.responseText);
        };
        var url = this.getUrl('/containers/' + name + '/restart');
        log.logDebug('url:', url);
        xhr.open('POST', url, true);
        xhr.send(null);
      },

      disconnectFromNetwork: function(container, network, onDisconnected) {
        log.logDebug('Request to disconnect container {} from network {}',
          container, network);
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 200:
                log.debug('Request to disconnect container <' + container +
                  '> from <' + network + '> DONE');
                if (onDisconnected) {
                  onDisconnected();
                }
                break;
              case 404:
              case 500:
                throw new Error(xhr.responseText);

              default:
                log.warn('Unhandled status: ' + xhr.status);
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.logError('Error: ', xhr.responseText);
          /*if (onFailure) {
            onFailure(xhr.responseText);
          }*/
        };
        xhr.onabort = function() {
          log.debug('Abort: ', xhr.responseText);
        };
        var url = this.getUrl('/networks/' + network + '/disconnect');
        log.logDebug('url:', url);
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ Container: container, Force: true }));
      },

      connectToNetwork: function(container, network, onConnected) {
        log.logDebug('Request to connect container ' + container + ' to ' +
          ' network ' + network);
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
            switch (xhr.status) {
              case 200:
                log.debug('Request to connect container <' + container +
                  '> to <' + network + '> DONE');
                if (onConnected) {
                  onConnected();
                }
                break;
              case 404:
              case 500:
                throw new Error(xhr.responseText);

              default:
                log.warn('Unhandled status: ' + xhr.status);
                break;
            }
          }
        };
        xhr.onerror = function() {
          log.logError('Error: ', xhr.responseText);
          /*if (onFailure) {
            onFailure(xhr.responseText);
          }*/
        };
        xhr.onabort = function() {
          log.debug('Abort: ', xhr.responseText);
        };
        var url = this.getUrl('/networks/' + network + '/connect');
        log.logDebug('url:', url);
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ Container: container }));
      }
    };

    return Docker;
  });
