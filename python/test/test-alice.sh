#!/bin/bash 

si pack ./python/reference-apps/python-alice -o python-alice.tar.gz
si seq send python-alice.tar.gz
si seq start -
si inst output - > alice-output.txt

diff alice-output.txt python/test/alice-expected.txt
