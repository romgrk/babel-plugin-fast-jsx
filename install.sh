#!/bin/bash
set -euf
set -o pipefail

ln -s `realpath ./node_modules/@babel/plugin-transform-arrow-functions/` ./node_modules/babel-plugin-transform-arrow-functions
