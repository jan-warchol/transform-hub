#!/bin/bash 

if ! si host version 2> /dev/null; then
  yarn start:dev --no-docker &
  sleep 5
fi
