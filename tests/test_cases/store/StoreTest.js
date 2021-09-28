define(['Suites', 'LoggerManager', 'Json', 'Message', 'Store'],
  function(Suites, LoggerManager, Json, Message, Store) {

    var StoreSuite = Suites.newSuite();
    var suite = StoreSuite.suite;
    var before = StoreSuite.before;
    var after = StoreSuite.after;
    var test = StoreSuite.test;
    var matcher = StoreSuite.matcher;

    var xtest = StoreSuite.notest;

    var logger = LoggerManager.getLoggerProxy('mqtt.cool.test');

    function FakeStorage() {
      this.db = {};
    }

    FakeStorage.prototype = {

      set: function(key, item) {
        this.db[key] = item;
      },

      remove: function(key) {
        delete this.db[key];
      },

      get: function(key) {
        return this.db[key];
      },

      keys: function() {
        var s = Object.keys(this.db);
        return s;
      }
    };

    /**
     * Returns implementations to be provided to a Store instance.
     * @returns an array of objects implementing the MqttStorage interface.
     */
    function getStorages() {
      /*
       * Returns:
       * - null, to trigger the DefaultStorageImpl class
       * - FakeStorage instance, just to test the interaction between the
       *   Store and any implementation of the MqttStorage interface.
       */
      var STORAGES = [null, new FakeStorage()];
      return STORAGES;
    }

    suite('Storage implementation Tests', function() {

      var store = null;
      var b_store = null;

      before(function() {
        store = new Store();
        logger.debug('New store created');
      });

      after(function() {
        store.clear();
        logger.debug('Store cleared');
        if (b_store) {
          b_store.clear();
          logger.debug('Second store cleared');
        }
      });

      test(1, 'when invoking open() method', function() {
        var enabled = store.open('client_id', 'tcp://localhost:1883');
        matcher('The store is enabled', enabled).is(true);
        matcher('The store is empty', 0).is(0);
      });

      test(2, 'when invoking open() method providing an invalid custom storage',
        function() {
          var enabled = store.open('client_id', 'tcp://localhost:1883',
            new Object());
          matcher('The store is not enabled', enabled).is(false);
        });

      test(3, 'when invoking open method() providing an invalid clientId' +
        'argument',
      function() {
        matcher('Throws invalid clientId argument exception', function() {
          store.open(undefined, 'tcp://localhost:1883');
        }).throws();
      }, function() {
        return [undefined, null, ''];
      });

      test(4, 'when invoking open method() providing an invalid brokerAlias' +
        ' argument',
      function(brokerAlias) {
        matcher('Throws invalid brokerAlias argument exception', function() {
          store.open('clientId', brokerAlias);
        }).throws();
      }, function() {
        return [undefined, null, ''];
      });

      test(5, 'when invoking store() and then retrieve()', function(data) {
        var message = new Message('a message');
        message.destinationName = 'topic';
        message.qos = 1;
        var packetToStore = {
          'type': 'PUBLISH',
          'packetId': 1,
          'message': Json.encodeMessageToJson(message)
        };
        var storage = data.storage;
        store.open('client_id', 'alias', storage);
        var key = store.store(packetToStore, data.state);
        matcher('The key should be valid', key)
          .is('alias_client_id_' + data.state + '_1');
        matcher('The store should have 1 item', store.size()).is(1);
        var storedItem = store.retrieve(key);
        matcher('An item should have been been retrieved', storedItem)
          .not.is(null);

        var body = storedItem.body;
        matcher('The packetId should be <1>', body.packetId).is(1);
        matcher('The body type should be <PUBLISH>', body.type)
          .is('PUBLISH');
        matcher('The item state should be "S"', storedItem.state)
          .is(data.state);
        matcher('The item pubrecReceived flag should be <false>', storedItem
          .pubrecReceived).is(false);
        matcher('The item sequence should be <1>', storedItem.seq).is(1);
        var retrievedMsg = Json.decodeMessageFromJson(body.message);
        matcher('Retrieve message should be equal to the stored one',
          retrievedMsg).isEqual(message);
        matcher('The store should have 1 item', store.size()).is(1);

        var item = store._getByPacketIdAndState(1, data.state);
        matcher('The item retrieved by "_getByPacketIdAndState" should be the' +
          ' equals to the one retrieved by "retrieve"', item)
          .isEqual(storedItem);

        var otherState = data.state == Store.ITEM_STATE.SENT ?
          Store.ITEM_STATE.RECEIVED : Store.ITEM_STATE.SENT;
        var noItem = store._getByPacketIdAndState(1, otherState);
        matcher('There should not be any item  stored with same packet id' +
          ' but with different sate', noItem).is(null);
      }, function() {
        return [
          {
            storage: null,
            state: Store.ITEM_STATE.SENT
          },
          {
            storage: new FakeStorage(),
            state: Store.ITEM_STATE.SENT
          },
          {
            storage: null,
            state: Store.ITEM_STATE.RECEIVED
          },
          {
            storage: new FakeStorage(),
            state: Store.ITEM_STATE.RECEIVED
          }
        ];
      });

      test(6, 'when invoking store() method passing an invalid state',
        function(state) {
          store.open('client_id', 'alias');
          matcher('Should throw an exception', function() {
            store.store({ type: 'PUBLISH', packetId: 1 }, state);
          }).throws();
        }, function() {
          return [undefined, null, 1, {}, 'state', true, false];
        });

      test(7, 'when invoking retrieve() method for an item stored with the ' +
        '"pubrecReceived" flag  set to true',
      function(storage) {
        store.open('client_id', 'alias', storage);
        var key = store.store({ type: 'PUBLISH', packetId: 1 },
          Store.ITEM_STATE.SENT, true);
        matcher('The key should be valid', key).is('alias_client_id_S_1');
        matcher('The store should have 1 item', store.size()).is(1);
        var storedItem = store.retrieve(key);
        matcher('An item should have been been retrieved', storedItem).not.
          is(null);

        var body = storedItem.body;
        matcher('The packetId should be <1>', body.packetId).is(1);
        matcher('The body type should be <PUBLISH>', body.type).
          is('PUBLISH');
        matcher('The item state should be "S"', storedItem.state).is('S');
        matcher('The item pubrecReceived flag should be <true>', storedItem.
          pubrecReceived).is(true);
        matcher('The item sequence should be <1>', storedItem.seq).is(1);
        matcher('The store should have 1 item', store.size()).is(1);

      }, getStorages);

      test(8, 'when invoking retrieve() passing a key not already stored',
        function(storage) {
          store.open('client_id', 'alias', storage);
          var storedItem = store.retrieve('alias_client_id_S_1');
          matcher('There should not be any item with specified key',
            storedItem).is(null);
        });

      test(9, 'when invoking store() and then remove()', function(storage) {
        store.open('client_id', 'alias', storage);
        var packetId = 1;
        var state = Store.ITEM_STATE.SENT;
        var key = store.store({ type: 'PUBLISH', packetId: packetId },
          state);
        matcher('The store has 1 item', store.size()).is(1);
        store.remove(packetId, state);
        matcher('The store is empty', store.size()).is(0);
        var storedItem = store.retrieve(key);
        matcher('Item has been removed', storedItem).is(null);
      }, getStorages);

      test(10, 'when invoking clear() method', function(storage) {
        store.open('client_id', 'alias', storage);
        store.store({ type: 'PUBLISH', packetId: 1 }, Store.ITEM_STATE.SENT);
        store.store({ type: 'PUBLISH', packetId: 2 }, Store.ITEM_STATE.SENT);
        matcher('The store has 2 items', store.size()).is(2);
        store.clear();
        matcher('The store is now empty ', store.size()).is(0);
      }, getStorages);

      test(11, 'when invoking processInOrder() method', function() {
        store.open('client_id', 'alias');
        store.store({ type: 'PUBLISH', packetId: 1 }, Store.ITEM_STATE.SENT);
        store.store({ type: 'PUBLISH', packetId: 2 }, Store.ITEM_STATE.SENT);
        var postProcessed = false;
        var processedItems = [];
        store.processInOrder(function(item) {
          processedItems.push(item);
        }, function() {
          postProcessed = true;
        });
        matcher('2 items have been processed 2', processedItems.length).is(2);
        matcher('The first item has sequence <1>', processedItems[0].seq).is(1);
        matcher('The second item has sequence <2>', processedItems[1].seq)
          .is(2);
        matcher('The post-processing has taken place', postProcessed).is(true);
      });

      test(12, 'when invoking processInOrder() method with no postProcessFunc',
        function() {
          store.open('client_id', 'alias');
          store.store({ type: 'PUBLISH', packetId: 1 }, Store.ITEM_STATE.SENT);
          store.store({ type: 'PUBLISH', packetId: 2 }, Store.ITEM_STATE.SENT);
          var processed = [];
          store.processInOrder(function(item) {
            processed.push(item);
          });
          matcher('2 items have been processed 2', processed.length).is(2);
          matcher('The first item has sequence <1>', processed[0].seq).is(1);
          matcher('The second item has sequence <2>', processed[1].seq).is(2);
        });

      test(13, 'when invoking processInOrder() method on an empty Store',
        function() {
          store.open('client_id', 'alias');
          var postProcessed = false;
          var processed = [];
          store.processInOrder(function(item) {
            processed.push(item);
          }, function() {
            postProcessed = true;
          });
          matcher('0 items have been processed 0', processed.length).is(0);
          matcher('No Post-processed has taken place', postProcessed).is(false);
        });

      test(14, 'when working with in parallel with two stores', function() {
        store.open('client_id', 'alias');
        store.store({ type: 'PUBLISH', packetId: 1 }, Store.ITEM_STATE.SENT);
        b_store = new Store();
        b_store.open('client_id', 'alias2');
        matcher('The B Store is empty', b_store.size()).is(0);
        var key = b_store.store({ type: 'PUBLISH', packetId: 1 },
          Store.ITEM_STATE.SENT);
        matcher('The B Store has 1 item', b_store.size()).is(1);
        matcher('The first Store has 1 item', store.size()).is(1);
        var storedItem = b_store.retrieve(key);
        matcher('An item has been retrieved from the B Store', storedItem)
          .not.is(null);
        store.clear();
        matcher('The first store should be empty', store.size()).is(0);
        matcher('The first store should have 1 item', b_store.size()).is(1);
      });
    });

    return StoreSuite;
  });
