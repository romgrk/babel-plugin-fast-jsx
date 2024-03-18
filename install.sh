#!/bin/bash
set -euf
set -o pipefail

ln -sf `realpath ./node_modules/@babel/plugin-transform-arrow-functions/` ./node_modules/babel-plugin-transform-arrow-functions
