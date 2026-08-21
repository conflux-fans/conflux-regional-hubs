#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
revision="${1:-HEAD}"
commit="$(git -C "${project_root}" rev-parse "${revision}^{commit}")"
output_dir="${project_root}/public/downloads"
output="${output_dir}/conflux-regional-hubs-source.zip"
checksum="${output}.sha256"
stage="$(mktemp -d)"
trap 'rm -rf "${stage}"' EXIT

mkdir -p "${output_dir}" "${stage}/conflux-regional-hubs"
git -C "${project_root}" archive \
  --format=zip \
  --prefix=conflux-regional-hubs/ \
  --output="${stage}/source.zip" \
  "${commit}"

printf '%s\n' "${commit}" > "${stage}/conflux-regional-hubs/SOURCE-REVISION.txt"
(
  cd "${stage}"
  zip -q -u source.zip conflux-regional-hubs/SOURCE-REVISION.txt
)
mv "${stage}/source.zip" "${output}"
(
  cd "${output_dir}"
  sha256sum "$(basename "${output}")" > "$(basename "${checksum}")"
)
unzip -tq "${output}"

echo "Packaged source commit ${commit}"
echo "Archive: ${output}"
echo "Checksum: ${checksum}"
