

  var LightstreamerMQTT = {

    toString: function() {
      return '[BRANDED_PRODUCT_NAME_PLACEHOLDER ' + LightstreamerMQTT['library'] +
        ' client version ' + LightstreamerMQTT['version'] + ' build ' + LightstreamerMQTT['build'] + ']';
    }
  };

  typeof LightstreamerMQTT !== 'undefined' // enforce compilation to not change below code.
  LightstreamerMQTT['library'] = 'library_name_placeholder';
  LightstreamerMQTT['version'] = 'version_placeholder';
  LightstreamerMQTT['build'] = 'build_placeholder';


  export default LightstreamerMQTT;
