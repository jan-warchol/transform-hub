#!/bin/bash 

si pack ./python/reference-apps/debug-input -o debug-input.tar.gz
si seq send debug-input.tar.gz

# send file as text - chunks should correspond to lines
si seq start -
si inst input - python/test/chunk-splitting-input.txt
si inst output - > splitting-output-1.txt

diff splitting-output-1.txt python/test/chunk-splitting-expected-1.txt

# send file as binary - all chunks except last one should have the same length
si seq start -
si inst input -t 'application/octet-stream' - python/test/chunk-splitting-input.txt
si inst output - > splitting-output-2.txt

diff splitting-output-2.txt python/test/chunk-splitting-expected-2.txt
