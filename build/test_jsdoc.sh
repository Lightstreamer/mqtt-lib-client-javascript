#!/bib/bash

# Specify 'web' or 'Node.js'
library=${1:-'Node.js'}
ant -buildfile test_jsdoc.xml -Dlibrary=$library
