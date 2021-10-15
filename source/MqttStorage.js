
  /**
   * Interface to be implemented for providing a custom storage layer to an
   * {@link MqttClient} instance that connects requiring the management of
   * session persistence.
   *
   * @see {@link MqttClient#connect}
   * @interface
   */
  function MqttStorage() { }

  MqttStorage.prototype = {

    /**
     * Adds or updates the given <code>key</code> to this storage, with the
     * associated string <code>value</code>.
     *
     * @param {string} key - The key to add or update.
     * @param {string} value - The value associated with the key.
     * @throws {Error} If any issue arises while adding or updating the key
     *   (e.g. the storage is full).
     */
    set: function(key, value) { },

    /**
     * Retrieves from this storage the string value associated with the given
     * <code>key</code>.
     *
     * @param {string} key - The key of the value to retrieve.
     * @return {string} The value associated with the given <code>key</code>.
     */
    get: function(key) { },

    /**
     * Removes the given <code>key</code> from this storage.
     *
     * @param {string} key - The key to remove.
     */
    remove: function(key) { },

    /**
     * Returns an array of all the keys contained in this storage.
     *
     * @return {Array<string>} An array containing all the keys.
     */
    keys: function() { }
  };

