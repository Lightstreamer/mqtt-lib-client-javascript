import DefaultStorage from 'DefaultStorage_stub';
import LoggerManager from '../LoggerManager';

    var log = LoggerManager.getLoggerProxy('mqtt.cool.store');

    /**
     * @constructor
     * @ignore
     **/
    var Store = function() {
      /** @type {number} */
      this._sequenceId = 0;

      /** @type {?string} */
      this._storeId = null;

      /** @type {boolean} */
      this._enabled = false;

      /** @type {MqttStorage} */
      this._storageImpl = null;
    };

    /**
     * Defines the possible states of an item to be stored into the storage.
     * @enum {string}
     */
    Store.ITEM_STATE = {
      'SENT': 'S',
      'RECEIVED': 'R'
    };

    Store.prototype = {

      _getKey: function(packetId, state) {
        log.logDebug('Making a store key from packetId and state:', packetId,
          state);
        for (var s in Store.ITEM_STATE) {
          if (state == Store.ITEM_STATE[s]) {
            return this._storeId + '_' + state + '_' + packetId;
          }
        }
        log.logError('Supplied state is not valid', state);
        throw Error('Invalid [state]: ' + state);
      },

      _each: function(func) {
        this._allKeys().forEach(function(key) {
          // For each filtered key, apply the passed "func" function.
          func.apply(this, [key]);
        }, this);
      },

      _allKeys: function() {
        var allKeys = this._storageImpl.keys();
        return allKeys.filter(function(key) {
          // Filter keys which have been stored by this store.
          return key.indexOf(this._storeId) == 0;
        }, this);
      },

      /**
       * @param {string} clientId
       * @param {string} brokerAlias
       * @param {MqttStorage=} storageImpl
       * @return {boolean} <code>true</code> if the (underlying or provided)
       *   storage works as expected
       */
      open: function(clientId, brokerAlias, storageImpl) {
        log.logDebug('Opening the store:', clientId, brokerAlias);
        if (!clientId) {
          log.logError('Invalid clientId:', clientId);
          throw Error('Invalid <clientId> argument: ' + clientId);
        }

        if (!brokerAlias) {
          log.logError('Invalid brokerAlias:', brokerAlias);
          throw Error('Invalid <brokerAlias> argument: ' + brokerAlias);
        }

        this._storeId = brokerAlias + '_' + clientId;

        // In the case a MqttStorage implementation is supplied.
        if (storageImpl) {
          log.logDebug('A custom MqttStorage implementation has been supplied');
          this._storageImpl = storageImpl;
        } else {
          // Otherwise, use default implementation.
          log.logDebug('Setting up default MqttStorage implementation');
          this._storageImpl = new DefaultStorage();
        }
        this._enabled = function(storageImpl) {
          try {
            var x = '__storage_test__';
            storageImpl.set(x, x);
            var allKeys = storageImpl.keys();
            log.logDebug('Key size:', allKeys.length);
            if (storageImpl.get(x) !== x) {
              throw Error('Assertion failed upon checking ' +
                'MqttStorage.getItem()');
            }
            storageImpl.remove(x);
            return true;
          } catch (e) {
            log.logError(e);
            return false;
          }
        }(this._storageImpl);

        log.logInfo(this._enabled ? 'Store opened' : 'Store is not available');
        return this._enabled;
      },

      /**
       *
       * @param {{type: string, packetId: string}} packetBody
       * @param {string} state
       * @param {boolean=} pubReceived
       * @return {string}
       */
      store: function(packetBody, state, pubReceived) {
        var key = this._getKey(packetBody['packetId'], state);
        var storeItem = {
          'seq': ++this._sequenceId,
          'state': state,
          'pubrecReceived': pubReceived || false,
          'body': packetBody
        };
        var storeItemAsString = JSON.stringify(storeItem);
        log.logDebug('Stringified item to be stored:', storeItemAsString);

        try {
          this._storageImpl.set(key, storeItemAsString);
          log.logDebug('Item stored with key:', key);
        } catch (e) {
          log.logError(e);
          throw Error('The following error occurred while writing into the ' +
            'store: ' + e);
        }

        log.logInfo('Stored packet body:', packetBody);
        return key;
      },

      retrieve: function(id) {
        try {
          var storedItemString = this._storageImpl.get(id);
          if (storedItemString) {
            return JSON.parse(storedItemString);
          }
          return null;
        } catch (e) {
          throw Error('The following error occurred while reading from the ' +
            'store: ' + e);
        }
      },

      _getByPacketIdAndState: function(packetId, state) {
        var key = this._getKey(packetId, state);
        return this.retrieve(key);
      },

      /**
       * @param {string} packetId
       * @param {string} state
       */
      remove: function(packetId, state) {
        var id = this._getKey(packetId, state);
        /*
         * if (!this._storageImpl.get(id)) { throw Error("No Item found
         * with id: " + id); }
         */
        try {
          //Objects.invoke(this._storageImpl, 'remove', [id]);
          this._storageImpl.remove(id);
        } catch (e) {
          throw Error('The following error occurred while removing from the ' +
            'store: ' + e);
        }

      },

      /**
       * @param {function} consumerFunc
       * @param {function} postProcessFunc
       * @param {Object} thisArg
       */
      processInOrder: function(consumerFunc, postProcessFunc, thisArg) {
        if (!this._enabled) {
          return;
        }

        // Populate the items array with all stored items.
        var storedItems = this._allKeys().map(function(key) {
          return this.retrieve(key);
        }, this);

        // Sort the stored items by their sequence id.
        var orderedItems = storedItems.sort(function(a, b) {
          return a['seq'] - b['seq'];
        });

        // Apply the consumerFunc function to each item.
        orderedItems.forEach(function(storedItem) {
          consumerFunc.apply(thisArg, [storedItem]);
        });

        // Invoke postProcessFunc only if at least one item has been restored.
        if (orderedItems.length > 0 && postProcessFunc) {
          postProcessFunc.apply(thisArg, []);
        }
      },

      size: function() {
        var counter = 0;
        this._each(function(/** key */) {
          // Argument key not used
          counter++;
        });
        return counter;
      },

      clear: function() {
        if (!this._enabled) {
          return;
        }

        this._each(function(key) {
          this._storageImpl.remove(key);
        });
      }
    };

    Store['ITEM_STATE'] = Store.ITEM_STATE;
    Store.prototype['open'] = Store.prototype.open;
    Store.prototype['store'] = Store.prototype.store;
    Store.prototype['retrieve'] = Store.prototype.retrieve;
    Store.prototype['_allKeys'] = Store.prototype._allKeys;
    Store.prototype['_getByPacketIdAndState'] = Store.prototype.
      _getByPacketIdAndState;
    Store.prototype['remove'] = Store.prototype.remove;
    Store.prototype['size'] = Store.prototype.size;
    Store.prototype['processInOrder'] = Store.prototype.processInOrder;
    Store.prototype['clear'] = Store.prototype.clear;

    export default Store;
