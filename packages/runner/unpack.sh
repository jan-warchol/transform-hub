#!/usr/bin/env bash

PACKAGE_DIR=${PACKAGE_DIR:-/package}

set -e

tar zxf - -C $PACKAGE_DIR && touch $PACKAGE_DIR/.ready
