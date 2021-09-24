#!/bin/bash

. ./env.sh

if [ ! -r "${pkg_dir}/${pkg_file}" ]; then
  die "No ${pkg_file} in pkg archive."
fi

cat ${pkg_dir}/${pkg_file} \
  | jq -c '{ name, version, description, main, keywords, engines, config: .scramjet.config, image: .scramjet.image }'
